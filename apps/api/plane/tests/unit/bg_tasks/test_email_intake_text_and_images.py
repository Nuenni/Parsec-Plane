# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Fork-specific addition, not part of upstream Plane.

Three things the email intake got wrong on 24.10.2026 (PGSUP-42/43):
the mail text went into the work item unescaped, so a customer's <script>
line vanished; a screenshot pasted into a Gmail reply was dropped; and an
app that already opened the work item through the API and also mailed the
team about it produced a second, duplicate intake item.
"""

from email.message import EmailMessage
from types import SimpleNamespace

import pytest

from plane.bgtasks.email_intake_task import (
    _is_ignored_sender,
    _text_to_html,
    parse_email_message,
    process_parsed_email,
)

SCRIPT_LINE = '<script src="https://api.payglue.io/paywall.js" data-org="acme"></script>'


def _gmail_reply_with_screenshot():
    """What Gmail sends for a reply with a pasted screenshot: a text part with a
    placeholder, an HTML part referencing the image by Content-ID, and the image."""
    msg = EmailMessage()
    msg["From"] = "Reader <reader@example.com>"
    msg["Subject"] = "Re: Paywall"
    msg["Message-ID"] = "<reply@example.com>"
    msg.set_content("It shows Active now, but no button:\n\n[image: image.png]\n\nThe post is public.")
    msg.add_alternative(
        '<p>It shows Active now, but no button:</p><img src="cid:ii_abc123"><p>The post is public.</p>',
        subtype="html",
    )
    msg.get_payload()[1].add_related(
        b"\x89PNG fake",
        maintype="image",
        subtype="png",
        cid="<ii_abc123>",
        filename="image.png",
        disposition="inline",
    )
    return msg.as_bytes()


@pytest.mark.unit
def test_markup_in_mail_text_stays_visible():
    html = _text_to_html(f"This is the code I injected:\n\n{SCRIPT_LINE}\n\nThanks")

    assert "<script" not in html
    assert "&lt;script src=&quot;https://api.payglue.io/paywall.js&quot;" in html
    assert html.startswith("<p>This is the code I injected:</p>")


@pytest.mark.unit
def test_paragraphs_and_line_breaks():
    assert _text_to_html("Best regards,\nReader\n\nPS") == "<p>Best regards,<br />Reader</p><p>PS</p>"
    assert _text_to_html("") == "<p></p>"


@pytest.mark.unit
def test_image_replaces_its_placeholder_and_others_are_appended():
    tags = [
        (["[image: a.png]"], '<image-component src="1"></image-component>'),
        (["[image: b.png]"], '<image-component src="2"></image-component>'),
    ]

    html = _text_to_html("Look:\n[image: a.png]\nthere", tags)

    assert html == (
        '<p>Look:</p><image-component src="1"></image-component><p>there</p><image-component src="2"></image-component>'
    )


@pytest.mark.unit
def test_embedded_gmail_image_is_extracted():
    parsed = parse_email_message(_gmail_reply_with_screenshot())

    assert parsed["attachments"] == []
    assert len(parsed["inline_images"]) == 1
    image = parsed["inline_images"][0]
    assert image["filename"] == "image.png"
    assert image["content_id"] == "ii_abc123"
    assert image["content_type"] == "image/png"
    assert image["data"] == b"\x89PNG fake"
    assert "[image: image.png]" in parsed["body"]


@pytest.mark.unit
def test_image_attachment_is_not_an_inline_image():
    msg = EmailMessage()
    msg["From"] = "reader@example.com"
    msg.set_content("Attached.")
    msg.add_attachment(b"\x89PNG fake", maintype="image", subtype="png", filename="shot.png")

    parsed = parse_email_message(msg.as_bytes())

    assert parsed["inline_images"] == []
    assert len(parsed["attachments"]) == 1


@pytest.mark.unit
@pytest.mark.parametrize(
    "sender, expected",
    [
        ("team@payglue.io", True),
        ("Team@PayGlue.io", True),
        ("anyone@internal.example", True),
        ("reader@example.com", False),
        ("team@payglue.io.evil.example", False),
        ("", False),
    ],
)
def test_ignored_senders(sender, expected):
    config = SimpleNamespace(ignored_senders="team@payglue.io\n@internal.example, ")

    assert _is_ignored_sender(config, sender) is expected


@pytest.mark.unit
def test_nothing_is_ignored_by_default():
    assert _is_ignored_sender(SimpleNamespace(ignored_senders=""), "team@payglue.io") is False


def _setup_project(monkeypatch, settings):
    from plane.db.models import EmailIntakeConfig, Intake
    from plane.tests.factories import ProjectFactory

    uploaded = []

    class FakeStorage:
        def __init__(self, *args, **kwargs):
            pass

        def upload_file(self, file_obj, object_name, content_type=None, extra_args=None):
            uploaded.append((object_name, content_type))
            return True

    monkeypatch.setattr("plane.settings.storage.S3Storage", FakeStorage)
    monkeypatch.setattr("plane.bgtasks.email_intake_task.issue_activity.delay", lambda *a, **k: None)
    monkeypatch.setattr("plane.bgtasks.email_intake_task._send_threaded_email", lambda *a, **k: None)
    settings.FILE_SIZE_LIMIT = 1024

    project = ProjectFactory()
    Intake.objects.create(name="Intake", project=project, workspace=project.workspace)
    config = EmailIntakeConfig.objects.create(
        project=project,
        workspace=project.workspace,
        email_address="support@example.com",
        imap_host="imap.example.com",
        imap_username="support",
        smtp_host="smtp.example.com",
        smtp_username="support",
        ignored_senders="team@payglue.io",
    )
    return config, uploaded


@pytest.mark.unit
@pytest.mark.django_db
def test_ignored_sender_creates_no_work_item(monkeypatch, settings):
    from plane.db.models import Issue

    config, _ = _setup_project(monkeypatch, settings)
    parsed = {
        "from_email": "team@payglue.io",
        "from_name": "PayGlue",
        "subject": "Support: SUP-1 from acme",
        "message_id": "<notify@payglue.io>",
        "in_reply_to": None,
        "references": [],
        "body": "copy",
        "attachments": [],
        "inline_images": [],
        "is_automated": False,
    }

    assert process_parsed_email(config, parsed) is None
    assert Issue.objects.filter(project_id=config.project_id).count() == 0


@pytest.mark.unit
@pytest.mark.django_db
def test_new_mail_keeps_markup_and_embeds_image(monkeypatch, settings):
    from plane.db.models import FileAsset

    config, uploaded = _setup_project(monkeypatch, settings)
    parsed = parse_email_message(_gmail_reply_with_screenshot())
    parsed["body"] = f"Code:\n\n{SCRIPT_LINE}\n\n{parsed['body']}"

    issue = process_parsed_email(config, parsed)

    assert "&lt;script src=" in issue.description_html
    asset = FileAsset.objects.get(issue_id=issue.id, entity_type=FileAsset.EntityTypeContext.ISSUE_DESCRIPTION)
    assert f'<image-component src="{asset.id}"' in issue.description_html
    assert "[image: image.png]" not in issue.description_html
    assert uploaded and uploaded[0][1] == "image/png"

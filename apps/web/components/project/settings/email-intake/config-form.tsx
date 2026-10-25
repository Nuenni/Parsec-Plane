/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Button } from "@makeplane/propel/components/button";
import { Input } from "@makeplane/propel/components/input";
import { useState } from "react";
import useSWR from "swr";
import { setToast } from "@plane/blocks/toast";
import type { TEmailIntakeConfig, TEmailIntakeConfigCreate } from "@plane/types";
// services
import { EmailIntakeConfigService } from "@/services/project/email-intake-config.service";
import { ProjectStateService } from "@/services/project/project-state.service";

const projectStateService = new ProjectStateService();
const emailIntakeConfigService = new EmailIntakeConfigService();

type Props = {
  workspaceSlug: string;
  projectId: string;
  initialValue?: TEmailIntakeConfig;
  onSubmit: (data: TEmailIntakeConfigCreate) => Promise<void>;
  submitLabel: string;
};

const emptyForm: TEmailIntakeConfigCreate = {
  email_address: "",
  imap_host: "",
  imap_port: 993,
  imap_username: "",
  imap_password: "",
  imap_use_ssl: true,
  imap_folder: "INBOX",
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  smtp_use_tls: true,
  from_name: "",
  html_template: "",
  signature_html: "",
  state_on_customer_reply: null,
  state_on_agent_reply: null,
  ignored_senders: "",
};

export function EmailIntakeConfigForm(props: Props) {
  const { workspaceSlug, projectId, initialValue, onSubmit, submitLabel } = props;
  const { data: states } = useSWR(workspaceSlug && projectId ? `PROJECT_STATES_${projectId}` : null, () =>
    projectStateService.getStates(workspaceSlug, projectId)
  );
  const [form, setForm] = useState<TEmailIntakeConfigCreate>(
    initialValue
      ? {
          email_address: initialValue.email_address,
          imap_host: initialValue.imap_host,
          imap_port: initialValue.imap_port,
          imap_username: initialValue.imap_username,
          imap_password: "",
          imap_use_ssl: initialValue.imap_use_ssl,
          imap_folder: initialValue.imap_folder,
          smtp_host: initialValue.smtp_host,
          smtp_port: initialValue.smtp_port,
          smtp_username: initialValue.smtp_username,
          smtp_password: "",
          smtp_use_tls: initialValue.smtp_use_tls,
          from_name: initialValue.from_name,
          html_template: initialValue.html_template,
          signature_html: initialValue.signature_html,
          state_on_customer_reply: initialValue.state_on_customer_reply,
          state_on_agent_reply: initialValue.state_on_agent_reply,
          ignored_senders: initialValue.ignored_senders,
        }
      : emptyForm
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<string[] | null>(null);

  const update = <K extends keyof TEmailIntakeConfigCreate>(key: K, value: TEmailIntakeConfigCreate[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = initialValue
    ? true
    : form.email_address.trim() &&
      form.imap_host.trim() &&
      form.imap_username.trim() &&
      form.imap_password.trim() &&
      form.smtp_host.trim() &&
      form.smtp_username.trim() &&
      form.smtp_password.trim();

  const selectClassName = "rounded-md border-[0.5px] border-subtle-1 bg-layer-2 px-3 py-2 text-13 focus:outline-none";

  const handleListFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const folders = await emailIntakeConfigService.listImapFolders(workspaceSlug, projectId, {
        id: initialValue?.id,
        imap_host: form.imap_host,
        imap_port: form.imap_port ?? 993,
        imap_username: form.imap_username,
        imap_password: form.imap_password || undefined,
        imap_use_ssl: form.imap_use_ssl ?? true,
      });
      setAvailableFolders(folders);
      if (folders.length === 0) {
        setToast({ type: "warning", title: "No folders found" });
      }
    } catch (error: any) {
      setToast({
        type: "error",
        title: "Could not list folders",
        message: error?.error ?? "Check the IMAP host/username/password above first.",
      });
    } finally {
      setIsLoadingFolders(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="email-intake-address" className="text-11 text-tertiary">
            Mailbox address
          </label>
          <Input
            id="email-intake-address"
            value={form.email_address}
            onChange={(event) => update("email_address", event.target.value)}
            placeholder="support@yourdomain.com"
            size="md"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email-intake-from-name" className="text-11 text-tertiary">
            From name
          </label>
          <Input
            id="email-intake-from-name"
            value={form.from_name}
            onChange={(event) => update("from_name", event.target.value)}
            placeholder="Support"
            size="md"
          />
        </div>
      </div>

      <div className="border-t border-subtle pt-3">
        <h6 className="mb-2 text-13 font-medium">IMAP (incoming)</h6>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={form.imap_host}
            onChange={(event) => update("imap_host", event.target.value)}
            placeholder="IMAP host"
            size="md"
          />
          <Input
            type="number"
            value={form.imap_port}
            onChange={(event) => update("imap_port", Number(event.target.value))}
            placeholder="Port"
            size="md"
          />
          <Input
            value={form.imap_username}
            onChange={(event) => update("imap_username", event.target.value)}
            placeholder="Username"
            size="md"
          />
          <Input
            type="password"
            value={form.imap_password}
            onChange={(event) => update("imap_password", event.target.value)}
            placeholder={initialValue ? "•••• (leave blank to keep current)" : "Password"}
            size="md"
          />
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <label htmlFor="email-intake-imap-folder" className="text-11 text-tertiary">
            Folder to poll
          </label>
          <div className="flex items-center gap-2">
            {availableFolders && availableFolders.length > 0 ? (
              <select
                id="email-intake-imap-folder"
                className={`${selectClassName} flex-1`}
                value={form.imap_folder}
                onChange={(event) => update("imap_folder", event.target.value)}
              >
                {form.imap_folder && !availableFolders.includes(form.imap_folder) && (
                  <option value={form.imap_folder}>{form.imap_folder}</option>
                )}
                {availableFolders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex-1">
                <Input
                  size="md"
                  id="email-intake-imap-folder"
                  value={form.imap_folder}
                  onChange={(event) => update("imap_folder", event.target.value)}
                  placeholder="INBOX"
                />
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              stretch="auto"
              label="List folders"
              onClick={handleListFolders}
              loading={isLoadingFolders}
              disabled={!form.imap_host.trim() || !form.imap_username.trim()}
            />
          </div>
          <p className="text-11 text-tertiary">
            Defaults to INBOX. If this mailbox is a shared alias (e.g. a Fastmail alias landing in your personal inbox),
            set up a server-side rule to move mail for that alias into a dedicated folder, then use "List folders" to
            pick it (needs the IMAP host/username/password above filled in first - password can be left blank here if
            you&apos;re editing an existing, already-saved config).
          </p>
        </div>
      </div>

      <div className="border-t border-subtle pt-3">
        <h6 className="mb-2 text-13 font-medium">SMTP (outgoing)</h6>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={form.smtp_host}
            onChange={(event) => update("smtp_host", event.target.value)}
            placeholder="SMTP host"
            size="md"
          />
          <Input
            type="number"
            value={form.smtp_port}
            onChange={(event) => update("smtp_port", Number(event.target.value))}
            placeholder="Port"
            size="md"
          />
          <Input
            value={form.smtp_username}
            onChange={(event) => update("smtp_username", event.target.value)}
            placeholder="Username"
            size="md"
          />
          <Input
            type="password"
            value={form.smtp_password}
            onChange={(event) => update("smtp_password", event.target.value)}
            placeholder={initialValue ? "•••• (leave blank to keep current)" : "Password"}
            size="md"
          />
        </div>
      </div>

      <div className="border-t border-subtle pt-3">
        <h6 className="mb-2 text-13 font-medium">Ignored senders</h6>
        <p className="mb-2 text-11 text-tertiary">
          Mail from these senders never becomes a work item. One per line or comma separated: a full address, or{" "}
          <code className="text-tertiary">@example.com</code> for a whole domain. Useful when one of your own systems
          already opened the work item and also mails this inbox about it.
        </p>
        <textarea
          id="email-intake-ignored-senders"
          value={form.ignored_senders ?? ""}
          onChange={(event) => update("ignored_senders", event.target.value)}
          placeholder="notifications@example.com"
          rows={3}
          className="font-mono w-full rounded-md border-[0.5px] border-subtle-1 bg-layer-2 p-2 text-11 focus:outline-none"
        />
      </div>

      <div className="border-t border-subtle pt-3">
        <h6 className="mb-2 text-13 font-medium">Status automation</h6>
        <p className="mb-2 text-11 text-tertiary">
          Reuses this project&apos;s own states. Leave a dropdown on &quot;Don&apos;t change&quot; to skip that
          automation.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="email-intake-state-customer" className="text-11 text-tertiary">
              When a customer replies by email
            </label>
            <select
              id="email-intake-state-customer"
              className={selectClassName}
              value={form.state_on_customer_reply ?? ""}
              onChange={(event) => update("state_on_customer_reply", event.target.value || null)}
            >
              <option value="">Don&apos;t change</option>
              {states?.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email-intake-state-agent" className="text-11 text-tertiary">
              When a teammate replies externally
            </label>
            <select
              id="email-intake-state-agent"
              className={selectClassName}
              value={form.state_on_agent_reply ?? ""}
              onChange={(event) => update("state_on_agent_reply", event.target.value || null)}
            >
              <option value="">Don&apos;t change</option>
              {states?.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-subtle pt-3">
        <h6 className="mb-2 text-13 font-medium">Email template</h6>
        <p className="mb-2 text-11 text-tertiary">
          Optional. Paste custom HTML to replace the default look. Available placeholders:{" "}
          <code className="text-tertiary">{"{{ brand_name }}"}</code>,{" "}
          <code className="text-tertiary">{"{{ heading }}"}</code>,{" "}
          <code className="text-tertiary">{"{{ body }}"}</code>,{" "}
          <code className="text-tertiary">{"{{ signature }}"}</code>. Leave blank to use the built-in template.
        </p>
        <textarea
          value={form.html_template}
          onChange={(event) => update("html_template", event.target.value)}
          placeholder="<div>...</div>"
          rows={6}
          className="font-mono w-full rounded-md border-[0.5px] border-subtle-1 bg-layer-2 p-2 text-11 focus:outline-none"
        />
        <label htmlFor="email-intake-signature" className="mt-3 mb-1 block text-11 text-tertiary">
          Signature (HTML, appended to every email)
        </label>
        <textarea
          id="email-intake-signature"
          value={form.signature_html}
          onChange={(event) => update("signature_html", event.target.value)}
          placeholder="<p>-- <br>The Support Team</p>"
          rows={3}
          className="font-mono w-full rounded-md border-[0.5px] border-subtle-1 bg-layer-2 p-2 text-11 focus:outline-none"
        />
      </div>

      <div>
        <Button
          variant="primary"
          size="md"
          stretch="auto"
          label={submitLabel}
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!canSubmit}
        />
      </div>
    </div>
  );
}

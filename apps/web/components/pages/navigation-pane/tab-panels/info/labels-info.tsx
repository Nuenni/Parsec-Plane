/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
// components
import { LabelSelect } from "@/components/dropdowns/label/label-select";
// store
import type { TPageInstance } from "@/store/pages/base-page";

type Props = {
  page: TPageInstance;
  disabled?: boolean;
};

export const PageNavigationPaneInfoTabLabelsInfo = observer(function PageNavigationPaneInfoTabLabelsInfo(props: Props) {
  const { page, disabled = false } = props;
  // translation
  const { t } = useTranslation();
  // derived values
  const labelIds = page.label_ids ?? [];
  const projectId = page.project_ids?.[0];

  if (!projectId) return null;

  const handleChange = (ids: string[]) => {
    page.update({ labels: ids, label_ids: ids });
  };

  return (
    <div className="mt-4">
      <p className="text-11 font-medium text-tertiary">{t("common.labels")}</p>
      <div className="mt-2">
        <LabelSelect
          projectId={projectId}
          value={labelIds}
          onChange={handleChange}
          disabled={disabled}
          placeholder={t("common.none")}
          variant="select-ghost-md"
        />
      </div>
    </div>
  );
});

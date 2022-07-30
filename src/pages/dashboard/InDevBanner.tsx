// Copyright (c) 2020-2021 Drew Lemmy
// This file is part of KristWeb 2 under AGPL-3.0.
// Full details: https://github.com/tmpim/KristWeb2/blob/master/LICENSE.txt
import { Alert } from "antd";

import { useTranslation, Trans } from "react-i18next";

import { getAuthorInfo, getDevState } from "@utils";

export function InDevBanner(): JSX.Element | null {
  const { t } = useTranslation();

  const { gitURL } = getAuthorInfo();

  // This is not a hook, run this after the hooks (to avoid changing hook count)
  const { isDirty, isDev } = getDevState();

  // Don't show the beta banner unless we are in development mode (push up the
  // repository link)
  if (!isDev && !isDirty) return null;

  return <Alert
    style={{ marginBottom: 24 }}
    type="info"
    message={<Trans t={t} i18nKey="dashboard.inDevBanner2">
      Welcome to the KristWeb v2 public beta! This site is relatively new, so
      please report any bugs on
      <a href={gitURL + "/issues/new"} target="_blank" rel="noopener noreferrer">GitHub</a>.
      Thanks!
    </Trans>}
  />;
}

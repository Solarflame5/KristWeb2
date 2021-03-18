// Copyright (c) 2020-2021 Drew Lemmy
// This file is part of KristWeb 2 under GPL-3.0.
// Full details: https://github.com/tmpim/KristWeb2/blob/master/LICENSE.txt
import { Button } from "antd";
import { PageLayout } from "@layout/PageLayout";

import { useWallets, deleteWallet } from "@wallets";

import Debug from "debug";
const debug = Debug("kristweb:dev-page");

export function DevPage(): JSX.Element {
  const { wallets } = useWallets();

  return <PageLayout
    title="Dev page"
    siteTitle="Dev page"
  >
    {/* Delete all wallets with zero balance */}
    <Button danger onClick={() => {
      const toDelete = Object.values(wallets)
        .filter(w => !w.balance || w.balance === 0);

      debug("deleting wallets with zero balance: ", toDelete);

      toDelete.forEach(deleteWallet);
    }}>
      Delete all wallets with zero balance
    </Button>

    {/* Delete all wallets */}
    <Button danger onClick={() => Object.values(wallets).forEach(deleteWallet)}>
      Delete all wallets
    </Button>
  </PageLayout>;
}

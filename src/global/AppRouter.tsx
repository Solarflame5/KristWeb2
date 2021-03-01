// Copyright (c) 2020-2021 Drew Lemmy
// This file is part of KristWeb 2 under GPL-3.0.
// Full details: https://github.com/tmpim/KristWeb2/blob/master/LICENSE.txt
import React from "react";
import { Switch, Route } from "react-router-dom";

import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { WalletsPage } from "../pages/wallets/WalletsPage";

import { AddressPage } from "../pages/addresses/AddressPage";
import { TransactionsPage, ListingType } from "../pages/transactions/TransactionsPage";

import { SettingsPage } from "../pages/settings/SettingsPage";
import { SettingsTranslations } from "../pages/settings/SettingsTranslations";

import { CreditsPage } from "../pages/credits/CreditsPage";

import { NotFoundPage } from "../pages/NotFoundPage";

interface AppRoute {
  path: string;
  name: string;
  component?: React.ReactNode;
}

export const APP_ROUTES: AppRoute[] = [
  { path: "/",                            name: "dashboard", component: <DashboardPage /> },
  { path: "/wallets",                     name: "wallets",   component: <WalletsPage /> },
  {
    path: "/me/transactions",
    name: "myTransactions",
    component: <TransactionsPage listingType={ListingType.WALLETS} />
  },

  { path: "/network/addresses/:address",  name: "address",   component: <AddressPage /> },
  {
    path: "/network/addresses/:address/transactions",
    name: "addressTransactions",
    component: <TransactionsPage listingType={ListingType.NETWORK_ADDRESS} />
  },
  {
    path: "/network/transactions",
    name: "transactions",
    component: <TransactionsPage listingType={ListingType.NETWORK_ALL} />
  },
  {
    path: "/network/names/:name/history",
    name: "nameHistory",
    component: <TransactionsPage listingType={ListingType.NAME_HISTORY} />
  },
  {
    path: "/network/names/:name/transactions",
    name: "nameTransactions",
    component: <TransactionsPage listingType={ListingType.NAME_SENT} />
  },

  { path: "/settings",                    name: "settings",  component: <SettingsPage /> },
  { path: "/settings/debug",              name: "settingsDebug" },
  { path: "/settings/debug/translations", name: "settings",  component: <SettingsTranslations /> },

  { path: "/credits",                     name: "credits",   component: <CreditsPage /> },
];

export function AppRouter(): JSX.Element {
  return <Switch>
    {APP_ROUTES.map(({ path, component }, key) => (
      component && <Route exact path={path} key={key}>{component}</Route>
    ))}

    <Route path="*"><NotFoundPage /></Route>
  </Switch>;
}

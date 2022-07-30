// Copyright (c) 2020-2021 Drew Lemmy
// This file is part of KristWeb 2 under AGPL-3.0.
// Full details: https://github.com/tmpim/KristWeb2/blob/master/LICENSE.txt
import { useState, useEffect, useCallback, useMemo, Dispatch, SetStateAction } from "react";
import { Table, TablePaginationConfig, Tag } from "antd";
import { ColumnsType, ColumnType } from "antd/lib/table";

import { useTFns, TStrFn } from "@utils/i18n";

import { KristName } from "@api/types";
import {
  lookupNames, LookupNamesOptions, LookupNamesResponse,
  SortableNameFields
} from "@api/lookup";
import {
  useMalleablePagination, useTableHistory, useDateColumnWidth, useMobileList,
  PaginationTableProps, RenderItem, SortOptions, SetOpenSortModalFn
} from "@utils/table/table";

import { useWallets, WalletAddressMap } from "@wallets";
import { NameActions } from "./mgmt/NameActions";
import { NameMobileItem } from "./NameMobileItem";

import { OpenEditNameFn } from "./mgmt/NameEditModalLink";
import { OpenSendTxFn } from "@comp/transactions/SendTransactionModalLink";
import { useNameTableLock } from "./tableLock";

import { useMiningEnabled } from "@api";

import { KristNameLink } from "@comp/names/KristNameLink";
import { ContextualAddress } from "@comp/addresses/ContextualAddress";
import { TransactionConciseMetadata } from "@comp/transactions/TransactionConciseMetadata";
import { DateTime } from "@comp/DateTime";

import dayjs from "dayjs";

import Debug from "debug";
const debug = Debug("kristweb:names-table");

function getColumns(
  tStr: TStrFn,
  dateColumnWidth: number,
  sortNew: boolean | undefined,
  walletAddressMap: WalletAddressMap,
  miningEnabled: boolean,
  twoDaysAgo: Date,
  openNameEdit: OpenEditNameFn,
  openSendTx: OpenSendTxFn
): ColumnsType<KristName> {
  return [
    // Name
    {
      title: tStr("columnName"),
      dataIndex: "name", key: "name",

      render: name => <KristNameLink name={name} />,

      sorter: true,
      defaultSortOrder: sortNew ? undefined : "ascend"
    },

    // Owner
    {
      title: tStr("columnOwner"),
      dataIndex: "owner", key: "owner",

      render: owner => owner && (
        <ContextualAddress
          className="names-table-address"
          address={owner}
          allowWrap
        />
      ),

      sorter: true
    },

    // Original owner
    {
      title: tStr("columnOriginalOwner"),
      dataIndex: "original_owner", key: "original_owner",

      render: owner => owner && (
        <ContextualAddress
          className="names-table-address"
          address={owner}
          allowWrap
        />
      ),

      sorter: true
    },

    // Data
    {
      title: tStr("columnData"),
      dataIndex: "a", key: "a",

      render: a => <TransactionConciseMetadata metadata={a} />,

      sorter: true
    },

    // Unpaid blocks
    ...(miningEnabled ? [{
      title: tStr("columnUnpaid"),
      dataIndex: "unpaid", key: "unpaid",

      render: unpaid => unpaid > 0
        ? <Tag color="CornFlowerBlue">{unpaid.toLocaleString()}</Tag>
        : <></>,
      width: 50,

      sorter: true
    } as ColumnType<KristName>] : []),

    // Registered time
    {
      title: tStr("columnRegistered"),
      dataIndex: "registered", key: "registered",

      render: (time, name) => <>
        {/* If mining is disabled, show a "New!" badge for names less than 48
          * hours old */}
        {!miningEnabled && isNameNew(name, twoDaysAgo) &&
          <Tag color="CornFlowerBlue">{tStr("rowNew")}</Tag>}

        <DateTime date={time} />
      </>,
      width: dateColumnWidth,

      sorter: true,
      defaultSortOrder: sortNew ? "descend" : undefined
    },

    // Updated time
    {
      title: tStr("columnUpdated"),
      dataIndex: "updated", key: "updated",

      render: time => <DateTime date={time} />,
      width: dateColumnWidth,

      sorter: true
    },

    // Transferred time
    {
      title: tStr("columnTransferred"),
      dataIndex: "transferred", key: "transferred",

      render: time => <DateTime date={time} />,
      width: dateColumnWidth,

      sorter: true
    },

    // Actions
    {
      key: "actions",
      width: 100, // Force it to be minimum size
      render: (_, record) => (
        <NameActions
          name={record}
          isOwn={!!walletAddressMap[record.owner]}

          openNameEdit={openNameEdit}
          openSendTx={openSendTx}
        />
      )
    }
  ];
}

const sortOptionsMiningEnabled: SortOptions<SortableNameFields> = [
  { sortKey: "name", i18nKey: "namesName" },
  { sortKey: "owner", i18nKey: "namesOwner" },
  { sortKey: "original_owner", i18nKey: "namesOriginalOwner" },
  { sortKey: "a", i18nKey: "namesData" },
  { sortKey: "unpaid", i18nKey: "namesUnpaid" },
  { sortKey: "registered", i18nKey: "namesRegistered" },
  { sortKey: "transferred", i18nKey: "namesTransferred" },
  { sortKey: "updated", i18nKey: "namesUpdated" }
];

const sortOptionsMiningDisabled: SortOptions<SortableNameFields> =
  sortOptionsMiningEnabled.filter(o => o.sortKey !== "unpaid");

interface Props {
  // Number used to trigger a refresh of the names listing
  refreshingID?: number;

  // Whether or not to sort by newest first by default
  sortNew?: boolean;

  addresses?: string[];
  setError?: Dispatch<SetStateAction<Error | undefined>>;
  setPagination?: Dispatch<SetStateAction<TablePaginationConfig>>;

  openNameEdit: OpenEditNameFn;
  openSendTx: OpenSendTxFn;
  setOpenSortModal?: SetOpenSortModalFn;
}

export function NamesTable({
  refreshingID,

  sortNew,

  addresses,
  setError,
  setPagination,
  setOpenSortModal,

  openNameEdit,
  openSendTx
}: Props): JSX.Element {
  const { tKey } = useTFns("names.");

  const defaultOrderBy = sortNew ? "registered" : "name";
  const defaultOrder = sortNew ? "DESC" : "ASC";

  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState<LookupNamesResponse>();
  const { options, setOptions } = useTableHistory<LookupNamesOptions>({
    orderBy: defaultOrderBy, order: defaultOrder
  });

  const { paginationTableProps, paginationChange, hotkeys } = useMalleablePagination(
    res, res?.names,
    tKey("tableTotal"),
    options, setOptions, setPagination
  );

  // Used to pause the table lookups when performing a bulk name edit
  const locked = useNameTableLock();

  // Don't show the 'unpaid blocks' sort option if mining is disabled
  const sortOptions = useMiningEnabled()
    ? sortOptionsMiningEnabled
    : sortOptionsMiningDisabled;

  // Fetch the names from the API, mapping the table options
  useEffect(() => {
    if (locked) {
      debug("skipping name lookup; table locked");
      return;
    }

    debug("looking up names for %s", addresses ? addresses.join(",") : "network");
    setLoading(true);

    lookupNames(addresses, options)
      .then(setRes)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [locked, refreshingID, addresses, setError, options]);

  debug("results? %b  res.names.length: %d  res.count: %d  res.total: %d", !!res, res?.names?.length, res?.count, res?.total);

  const renderMobileItem: RenderItem<KristName> = useCallback(name => (
    <NameMobileItem
      name={name}
      openNameEdit={openNameEdit}
      openSendTx={openSendTx}
    />
  ), [openNameEdit, openSendTx]);

  const { isMobile, list } = useMobileList(
    loading, res?.names || [], "name",
    paginationTableProps.pagination, paginationChange,
    sortOptions, defaultOrderBy, defaultOrder,
    options, setOptions, setOpenSortModal,
    renderMobileItem
  );

  return <>
    {isMobile && list
      ? list
      : <DesktopView
        loading={loading}
        res={res}

        sortNew={sortNew}

        paginationTableProps={paginationTableProps}

        openNameEdit={openNameEdit}
        openSendTx={openSendTx}
      />}
    {hotkeys}
  </>;
}

interface DesktopViewProps {
  loading: boolean;
  res?: LookupNamesResponse;

  sortNew?: boolean;

  paginationTableProps: PaginationTableProps<KristName>;

  openNameEdit: OpenEditNameFn;
  openSendTx: OpenSendTxFn;
}

function DesktopView({
  loading, res,
  sortNew,
  paginationTableProps,
  openNameEdit, openSendTx
}: DesktopViewProps): JSX.Element {
  const { tStr } = useTFns("names.");

  const dateColumnWidth = useDateColumnWidth();

  // Used to change the actions depending on whether or not we own the name
  const { walletAddressMap, joinedAddressList } = useWallets();

  // Don't show the 'unpaid names' column if mining is disabled
  const miningEnabled = useMiningEnabled();
  const twoDaysAgo = dayjs().subtract(2, "day").toDate();

  const columns = useMemo(() => getColumns(
    tStr, dateColumnWidth, sortNew, walletAddressMap, miningEnabled,
    twoDaysAgo, openNameEdit, openSendTx
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [tStr, dateColumnWidth, sortNew, joinedAddressList, miningEnabled,
    twoDaysAgo, openNameEdit, openSendTx]);

  const getRowClasses = useCallback((name: KristName): string => {
    // If mining is enabled, then show the unpaid highlight based on the actual
    // unpaid blocks count. Otherwise, show the highlight for 48 hours since
    // the name was purchased (approximately over the time it takes to mine 500
    // blocks at a rate of 1 block per 5 minutes)
    const unpaid = miningEnabled
      ? name.unpaid > 0
      : isNameNew(name, twoDaysAgo);
    return unpaid ? "name-row-unpaid" : "";
  }, [miningEnabled, twoDaysAgo]);

  return <Table<KristName>
    className="names-table"
    size="small"
    scroll={{ x: true }}

    loading={loading}
    dataSource={res?.names || []}
    rowKey="name"

    {...paginationTableProps}

    rowClassName={getRowClasses}

    columns={columns}
  />;
}

function isNameNew(name: KristName, twoDaysAgo: Date): boolean {
  return new Date(name.registered) > twoDaysAgo;
}

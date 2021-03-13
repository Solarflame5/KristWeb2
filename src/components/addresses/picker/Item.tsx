// Copyright (c) 2020-2021 Drew Lemmy
// This file is part of KristWeb 2 under GPL-3.0.
// Full details: https://github.com/tmpim/KristWeb2/blob/master/LICENSE.txt

import { Wallet } from "@wallets";
import { NameParts } from "@utils/currency";

import { KristValue } from "@comp/krist/KristValue";

import { OptionValue } from "./options";

interface AddressItemProps {
  address?: string;
  name?: NameParts;
  wallet?: Wallet;
}

function getPlainAddress({ address, name, wallet }: AddressItemProps): string {
  if (wallet) return wallet.address;
  if (name?.recipient) return name.recipient;
  else return address || "";
}

function PickerContent({
  name,
  wallet,
  plainAddress
}: AddressItemProps & { plainAddress: string }): JSX.Element {
  if (wallet && wallet.label) {
    // Show the wallet label if possible
    return <>
      <span className="address-picker-wallet-label">{wallet.label}&nbsp;</span>
      <span className="address-picker-wallet-address">({wallet.address})</span>
    </>;
  } else if (name?.recipient) {
    // Show a formatted name if possible
    const { metaname, nameWithSuffix } = name;
    return <>
      {metaname && <span className="address-picker-metaname">{metaname}@</span>}
      <span className="address-picker-name">{nameWithSuffix}</span>
    </>;
  } else {
    // Just show a plain address
    return <span className="address-picker-address">{plainAddress}</span>;
  }
}

/** Autocompletion option for the address picker. */
export function getAddressItem(props: AddressItemProps): OptionValue {
  // The address to use as a value
  const plainAddress = getPlainAddress(props);
  const { wallet } = props;

  return {
    label: (
      <div className="address-picker-address-item">
        {/* Address, wallet label, or name */}
        <div className="address-picker-item-content">
          <PickerContent {...props} plainAddress={plainAddress} />
        </div>

        {/* Wallet balance, if available */}
        {wallet && <KristValue hideNullish value={wallet.balance} />}
      </div>
    ),

    // The wallet label is used for filtering the options
    "data-wallet-label": wallet?.label,
    // The wallet itself is used for sorting the options
    "data-wallet": wallet,

    value: plainAddress
  };
}

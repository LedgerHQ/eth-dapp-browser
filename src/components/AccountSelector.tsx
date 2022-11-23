import Image from "next/image";
import { useCallback, useMemo } from "react";
import Select, { components, OptionTypeBase } from "react-select";
import styled, { useTheme } from "styled-components";

import { Account } from "@ledgerhq/live-app-sdk";

const IconContainer = styled.div`
  margin-right: 0.4em;
  flex-shrink: 0;
`;

const AccountDetails = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-grow: 1;
`;

const AccountName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: bold;
`;

const AccountAddress = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.5;
`;

const AccountIcon = ({ currencyId }: { currencyId: string }) => (
  <IconContainer>
    <Image src={`/icons/${currencyId}.svg`} width={24} height={24} />
  </IconContainer>
);

const AccountOption: typeof components.Option = ({
  children,
  data,
  ...rest
}) => (
  <components.Option data={data} {...rest}>
    <AccountIcon currencyId={data.data.currency} />
    <AccountDetails>
      <AccountName>{children}</AccountName>
      <AccountAddress>{data.data.address}</AccountAddress>
    </AccountDetails>
  </components.Option>
);

const AccountSummary: typeof components.SingleValue = ({
  children,
  data,
  ...rest
}) => (
  <components.SingleValue {...rest} data={data}>
    <AccountIcon currencyId={data.data.currency} />
    <AccountName>{children}</AccountName>
  </components.SingleValue>
);

const getSelectStyles = (theme: any) => ({
  control: (provided: any) => ({
    ...provided,
    width: 400,
    backgroundColor: "transparent",
  }),
  singleValue: (provided: any) => ({
    ...provided,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    fontSize: 12,
    color: theme.colors.neutral.c100,
  }),
  indicatorsContainer: (provided: any) => ({
    ...provided,
    color: "red",
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: theme.colors.background.main,
  }),
  option: (
    provided: any,
    { isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }
  ) => ({
    ...provided,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    fontSize: 12,
    color: isSelected ? theme.colors.neutral.c100 : theme.colors.neutral.c80,
    backgroundColor: isSelected
      ? isFocused
        ? theme.colors.primary.c50
        : theme.colors.primary.c70
      : isFocused
      ? theme.colors.primary.c10
      : "transparent",
  }),
});

type AccountSelectorProps = {
  accounts: Account[];
  onAccountChange: (account: Account | undefined) => void;
  selectedAccount: Account | undefined;
};

function fromAccountToOption(account: Account): OptionTypeBase {
  return {
    label: account.name,
    value: `${account.id}`,
    data: {
      address: account.address,
      balance: account.balance,
      currency: account.currency,
    },
  };
}

function AccountSelector({
  accounts,
  onAccountChange,
  selectedAccount,
}: AccountSelectorProps): JSX.Element {
  const theme = useTheme();
  const options = useMemo(
    () => accounts.map((account) => fromAccountToOption(account)),
    [accounts]
  );
  const value = useMemo(
    () => (selectedAccount ? fromAccountToOption(selectedAccount) : undefined),
    [selectedAccount]
  );

  const styles = useMemo(() => getSelectStyles(theme), [theme]);

  const handleOnChange = useCallback(
    (option: OptionTypeBase | null) => {
      const newSelectedAccount = option
        ? accounts.find((account) => account.id === option.value)
        : undefined;
      onAccountChange(newSelectedAccount);
    },
    [accounts, onAccountChange]
  );

  return (
    <div>
      <Select
        instanceId="account"
        options={options}
        styles={styles}
        components={{ SingleValue: AccountSummary, Option: AccountOption }}
        onChange={handleOnChange}
        value={value}
        isSearchable={false}
      />
    </div>
  );
}

export default AccountSelector;

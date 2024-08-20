import Image from "next/image";
import styled from "styled-components";

import { Account } from "@ledgerhq/live-app-sdk";
import { Button, Text } from "@ledgerhq/react-ui";

const Row = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const AccountDisplay = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-weight: 600;
`;

const AccountIcon = styled.div`
  margin-right: 0.4em;
  flex-shrink: 0;
`;

const AccountName = styled(Text)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type AccountRequestProps = {
  onRequestAccount: any;
  selectedAccount: Pick<Account, "currency" | "name"> | undefined;
};

function AccountRequest({
  onRequestAccount,
  selectedAccount,
}: AccountRequestProps): JSX.Element {
  return (
    <Row>
      <AccountDisplay>
        {selectedAccount ? (
          <>
            <AccountIcon>
              <Image
                src={`/icons/${selectedAccount.currency}.svg`}
                width={24}
                height={24}
              />
            </AccountIcon>
            <AccountName>{selectedAccount.name}</AccountName>
          </>
        ) : null}
      </AccountDisplay>
      <Button variant="shade" onClick={onRequestAccount}>
        {selectedAccount ? "Change account" : "Add Account"}
      </Button>
    </Row>
  );
}

export default AccountRequest;

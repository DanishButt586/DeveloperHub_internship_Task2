import React, { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { ArrowDownCircle, ArrowUpCircle, Send, Wallet } from "lucide-react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import {
  createDepositIntent,
  getPaymentHistory,
  transferFunds,
  withdrawFunds,
} from "../../lib/payments";
import { PaymentTransaction } from "../../types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const toNumber = (value: string) => Number(value || 0);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const PaymentsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [depositAmount, setDepositAmount] = useState("100");
  const [withdrawAmount, setWithdrawAmount] = useState("50");
  const [transferRecipientId, setTransferRecipientId] = useState("");
  const [transferAmount, setTransferAmount] = useState("25");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const loadHistory = async (nextPage = 1) => {
    setIsLoading(true);
    try {
      const data = await getPaymentHistory(nextPage, 10);
      setTransactions(data.transactions);
      setBalance(Number(data.balance || 0));
      setPage(data.page || nextPage);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load payment history."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory(1);
  }, []);

  const onDeposit = async () => {
    const amount = toNumber(depositAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid deposit amount.");
      return;
    }

    try {
      setIsDepositing(true);
      const { transaction } = await createDepositIntent(amount);
      toast.success(
        "Stripe test intent created. Complete payment in your Stripe checkout flow.",
      );
      setTransactions((prev) => [transaction, ...prev]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Deposit creation failed."));
    } finally {
      setIsDepositing(false);
    }
  };

  const onWithdraw = async () => {
    const amount = toNumber(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid withdrawal amount.");
      return;
    }

    try {
      setIsWithdrawing(true);
      const { transaction, balance: nextBalance } = await withdrawFunds(amount);
      setBalance(Number(nextBalance || 0));
      setTransactions((prev) => [transaction, ...prev]);
      toast.success("Withdrawal completed.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Withdrawal failed."));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const onTransfer = async () => {
    const amount = toNumber(transferAmount);
    if (!transferRecipientId) {
      toast.error("Recipient ID is required.");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter a valid transfer amount.");
      return;
    }

    try {
      setIsTransferring(true);
      const { transaction, balance: nextBalance } = await transferFunds(
        transferRecipientId,
        amount,
      );
      setBalance(Number(nextBalance || 0));
      setTransactions((prev) => [transaction, ...prev]);
      setTransferRecipientId("");
      toast.success("Transfer completed.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Transfer failed."));
    } finally {
      setIsTransferring(false);
    }
  };

  const canGoPrev = useMemo(() => page > 1, [page]);
  const canGoNext = useMemo(() => page < totalPages, [page, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-600">
            Manage wallet actions and view transaction history.
          </p>
        </div>

        <Card className="min-w-60">
          <CardBody className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs uppercase text-gray-500">Wallet Balance</p>
              <p className="text-xl font-semibold text-gray-900">
                {currencyFormatter.format(balance)}
              </p>
            </div>
            <Wallet className="text-primary-600" size={24} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ArrowDownCircle size={18} className="text-success-600" />
              Deposit (Stripe Test)
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Amount (USD)"
              type="number"
              min={1}
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              fullWidth
            />
            <Button fullWidth onClick={onDeposit} isLoading={isDepositing}>
              Create Deposit Intent
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ArrowUpCircle size={18} className="text-warning-600" />
              Withdraw
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Amount (USD)"
              type="number"
              min={1}
              step="0.01"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              fullWidth
            />
            <Button
              fullWidth
              variant="warning"
              onClick={onWithdraw}
              isLoading={isWithdrawing}
            >
              Withdraw Funds
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Send size={18} className="text-primary-600" />
              Transfer
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Recipient User ID"
              value={transferRecipientId}
              onChange={(e) => setTransferRecipientId(e.target.value)}
              fullWidth
            />
            <Input
              label="Amount (USD)"
              type="number"
              min={1}
              step="0.01"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              fullWidth
            />
            <Button
              fullWidth
              variant="secondary"
              onClick={onTransfer}
              isLoading={isTransferring}
            >
              Send Transfer
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Transaction History</h2>
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.length === 0 && !isLoading && (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={5}>
                      No transactions found.
                    </td>
                  </tr>
                )}

                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {txn.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {currencyFormatter.format(Number(txn.amount || 0))}{" "}
                      {txn.currency}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {txn.recipient?.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(txn.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
            <Button
              variant="outline"
              disabled={!canGoPrev || isLoading}
              onClick={() => void loadHistory(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!canGoNext || isLoading}
              onClick={() => void loadHistory(page + 1)}
            >
              Next
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

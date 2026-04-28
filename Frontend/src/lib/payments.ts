import api from "./api";
import { PaymentTransaction } from "../types";

type DepositResponse = {
  success: boolean;
  message?: string;
  clientSecret: string;
  transaction: PaymentTransaction;
};

type WalletActionResponse = {
  success: boolean;
  message?: string;
  transaction: PaymentTransaction;
  balance: number;
};

type PaymentHistoryResponse = {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  balance: number;
  transactions: PaymentTransaction[];
};

export const createDepositIntent = async (
  amount: number,
  currency = "USD",
): Promise<{ clientSecret: string; transaction: PaymentTransaction }> => {
  const { data } = await api.post<DepositResponse>("/api/payments/deposit", {
    amount,
    currency,
  });

  return {
    clientSecret: data.clientSecret,
    transaction: data.transaction,
  };
};

export const withdrawFunds = async (
  amount: number,
  currency = "USD",
): Promise<{ transaction: PaymentTransaction; balance: number }> => {
  const { data } = await api.post<WalletActionResponse>(
    "/api/payments/withdraw",
    {
      amount,
      currency,
    },
  );

  return {
    transaction: data.transaction,
    balance: data.balance,
  };
};

export const transferFunds = async (
  recipientId: string,
  amount: number,
  currency = "USD",
): Promise<{ transaction: PaymentTransaction; balance: number }> => {
  const { data } = await api.post<WalletActionResponse>(
    "/api/payments/transfer",
    {
      recipientId,
      amount,
      currency,
    },
  );

  return {
    transaction: data.transaction,
    balance: data.balance,
  };
};

export const getPaymentHistory = async (
  page = 1,
  limit = 10,
): Promise<PaymentHistoryResponse> => {
  const { data } = await api.get<PaymentHistoryResponse>(
    "/api/payments/history",
    {
      params: { page, limit },
    },
  );

  return data;
};

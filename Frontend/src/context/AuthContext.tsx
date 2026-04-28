import React, { createContext, useState, useContext, useEffect } from "react";
import { AxiosError } from "axios";
import { User, UserRole, AuthContextType, DashboardData } from "../types";
import api from "../lib/api";
import toast from "react-hot-toast";

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthApiResponse = {
  success: boolean;
  message?: string;
  user: User;
  dashboardData?: DashboardData;
  otpRequired?: boolean;
  otpToken?: string;
};

type ProfileApiResponse = {
  success: boolean;
  message?: string;
  profile: User;
  dashboardData?: DashboardData;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError) {
    const apiMessage = (
      error.response?.data as { message?: string } | undefined
    )?.message;
    return apiMessage || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUserFromAuthPayload = (authData: {
    user: User;
    dashboardData?: DashboardData;
  }) => {
    setUser({
      ...authData.user,
      dashboardData: authData.dashboardData ?? authData.user.dashboardData,
    });
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get<AuthApiResponse>("/api/auth/me");
        setUserFromAuthPayload(data);
      } catch (_error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrapSession();
  }, []);

  const login = async (
    email: string,
    password: string,
    role: UserRole,
  ): Promise<{ otpRequired: boolean; user?: User; otpToken?: string }> => {
    setIsLoading(true);

    try {
      const { data } = await api.post<AuthApiResponse>("/api/auth/login", {
        email,
        password,
        role,
      });

      if (data.otpRequired) {
        toast.success(data.message || "OTP sent to your email.");
        return {
          otpRequired: true,
          otpToken: data.otpToken,
        };
      }

      setUserFromAuthPayload(data);
      toast.success(data.message || "Successfully logged in!");
      return {
        otpRequired: false,
        user: data.user,
      };
    } catch (error) {
      const message = getErrorMessage(error, "Unable to sign in.");
      toast.error(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (otpToken: string, otp: string): Promise<User> => {
    setIsLoading(true);
    try {
      const { data } = await api.post<AuthApiResponse>("/api/auth/verify-otp", {
        otpToken,
        otp,
      });

      setUserFromAuthPayload(data);
      toast.success(data.message || "Successfully logged in!");
      return data.user;
    } catch (error) {
      const message = getErrorMessage(error, "OTP verification failed.");
      toast.error(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<void> => {
    setIsLoading(true);

    try {
      const { data } = await api.post<AuthApiResponse>("/api/auth/register", {
        name,
        email,
        password,
        role,
      });

      setUserFromAuthPayload(data);
      toast.success(data.message || "Account created successfully!");
    } catch (error) {
      const message = getErrorMessage(error, "Unable to create account.");
      toast.error(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (_email: string): Promise<void> => {
    toast("Password reset API is not configured in this backend yet.");
  };

  const resetPassword = async (
    _token: string,
    _newPassword: string,
  ): Promise<void> => {
    toast("Reset password API is not configured in this backend yet.");
  };

  const logout = (): void => {
    setUser(null);
    void api.post("/api/auth/logout").catch(() => undefined);
    toast.success("Logged out successfully");
  };

  const updateProfile = async (
    userId: string,
    updates: Partial<User>,
  ): Promise<void> => {
    try {
      if (!user || user.id !== userId) {
        throw new Error("You can only update your own profile.");
      }

      const { data } = await api.put<ProfileApiResponse>(
        "/api/profile/update",
        updates,
      );

      setUser({
        ...data.profile,
        dashboardData: data.dashboardData ?? user.dashboardData,
      });

      toast.success(data.message || "Profile updated successfully");
    } catch (error) {
      const message = getErrorMessage(error, "Unable to update profile.");
      toast.error(message);
      throw new Error(message);
    }
  };

  const value = {
    user,
    login,
    verifyOtp,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

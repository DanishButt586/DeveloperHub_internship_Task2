import { AxiosError } from "axios";
import api from "./api";
import { Meeting, MeetingConflictError } from "../types";

type MeetingsResponse = {
  success: boolean;
  meetings: Meeting[];
};

type MeetingResponse = {
  success: boolean;
  message?: string;
  meeting: Meeting;
};

type MeetingRoomResponse = {
  success: boolean;
  roomId: string;
  meetingId: string;
};

export type ScheduleMeetingPayload = {
  title: string;
  description?: string;
  inviteeId: string;
  startTime: string;
  endTime: string;
  meetingLink?: string;
};

export const getMyMeetings = async (): Promise<Meeting[]> => {
  const { data } = await api.get<MeetingsResponse>("/api/meetings/my");
  return data.meetings;
};

export const scheduleMeeting = async (
  payload: ScheduleMeetingPayload,
): Promise<Meeting> => {
  try {
    const { data } = await api.post<MeetingResponse>(
      "/api/meetings/schedule",
      payload,
    );
    return data.meeting;
  } catch (error) {
    if (
      error instanceof AxiosError &&
      error.response?.data?.code === "CONFLICT"
    ) {
      throw error.response.data as MeetingConflictError;
    }

    throw error;
  }
};

const updateMeetingStatus = async (
  meetingId: string,
  action: "accept" | "reject" | "cancel",
): Promise<Meeting> => {
  if (action === "cancel") {
    const { data } = await api.delete<MeetingResponse>(
      `/api/meetings/${meetingId}/cancel`,
    );
    return data.meeting;
  }

  const { data } = await api.patch<MeetingResponse>(
    `/api/meetings/${meetingId}/${action}`,
  );
  return data.meeting;
};

export const acceptMeeting = async (meetingId: string): Promise<Meeting> => {
  return updateMeetingStatus(meetingId, "accept");
};

export const rejectMeeting = async (meetingId: string): Promise<Meeting> => {
  return updateMeetingStatus(meetingId, "reject");
};

export const cancelMeeting = async (meetingId: string): Promise<Meeting> => {
  return updateMeetingStatus(meetingId, "cancel");
};

export const createMeetingRoom = async (meetingId: string): Promise<string> => {
  const { data } = await api.post<MeetingRoomResponse>(
    `/api/meetings/${meetingId}/room`,
  );
  return data.roomId;
};

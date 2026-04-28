import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  PlusCircle,
  XCircle,
} from "lucide-react";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import {
  acceptMeeting,
  cancelMeeting,
  getMyMeetings,
  rejectMeeting,
  scheduleMeeting,
} from "../../lib/meetings";
import { Meeting, MeetingConflictError, MeetingStatus } from "../../types";
import { useAuth } from "../../context/AuthContext";

type FormState = {
  title: string;
  description: string;
  inviteeId: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
};

const initialFormState: FormState = {
  title: "",
  description: "",
  inviteeId: "",
  startTime: "",
  endTime: "",
  meetingLink: "",
};

const statusVariantMap: Record<
  MeetingStatus,
  "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "gray"
> = {
  PENDING: "warning",
  ACCEPTED: "success",
  REJECTED: "error",
  CANCELLED: "gray",
};

export const DealsPage: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>(initialFormState);

  const loadMeetings = async () => {
    setIsLoading(true);
    try {
      const response = await getMyMeetings();
      setMeetings(response);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string } | undefined)
              ?.message || "Unable to fetch meetings."
          : "Unable to fetch meetings.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMeetings();
  }, []);

  const monthDays = useMemo(() => {
    const now = new Date();
    return eachDayOfInterval({
      start: startOfMonth(now),
      end: endOfMonth(now),
    });
  }, []);

  const pendingMeetings = useMemo(
    () => meetings.filter((meeting) => meeting.status === "PENDING"),
    [meetings],
  );

  const acceptedMeetings = useMemo(
    () => meetings.filter((meeting) => meeting.status === "ACCEPTED"),
    [meetings],
  );

  const handleInputChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleScheduleMeeting = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await scheduleMeeting({
        title: formState.title,
        description: formState.description,
        inviteeId: formState.inviteeId,
        startTime: new Date(formState.startTime).toISOString(),
        endTime: new Date(formState.endTime).toISOString(),
        meetingLink: formState.meetingLink,
      });

      toast.success("Meeting scheduled successfully.");
      setFormState(initialFormState);
      await loadMeetings();
    } catch (error) {
      const conflict = error as MeetingConflictError;
      if (conflict?.code === "CONFLICT") {
        const clashingMeeting = conflict.details?.clashingMeeting;
        const clashTitle = clashingMeeting?.title || "existing meeting";
        const clashTime = clashingMeeting
          ? `${format(parseISO(clashingMeeting.startTime), "PPP p")} to ${format(parseISO(clashingMeeting.endTime), "p")}`
          : "overlapping slot";
        toast.error(`Conflict: ${clashTitle} (${clashTime})`);
      } else if (error instanceof AxiosError) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ||
          "Unable to schedule meeting.";
        toast.error(message);
      } else {
        toast.error("Unable to schedule meeting.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateMeeting = async (
    meetingId: string,
    action: "accept" | "reject" | "cancel",
  ) => {
    try {
      if (action === "accept") {
        await acceptMeeting(meetingId);
        toast.success("Meeting accepted.");
      } else if (action === "reject") {
        await rejectMeeting(meetingId);
        toast.success("Meeting rejected.");
      } else {
        await cancelMeeting(meetingId);
        toast.success("Meeting cancelled.");
      }

      await loadMeetings();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string } | undefined)
              ?.message || "Unable to update meeting."
          : "Unable to update meeting.";
      toast.error(message);
    }
  };

  const canRespond = (meeting: Meeting) => {
    return user?.id === meeting.inviteeId && meeting.status === "PENDING";
  };

  const canCancel = (meeting: Meeting) => {
    const isParticipant =
      user?.id === meeting.inviteeId || user?.id === meeting.hostId;
    return Boolean(isParticipant && meeting.status !== "CANCELLED");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Calendar</h1>
          <p className="text-gray-600">
            Schedule meetings, avoid clashes, and manage invite responses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-lg mr-3">
                <Calendar size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Meetings</p>
                <p className="text-lg font-semibold text-gray-900">
                  {meetings.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-warning-100 rounded-lg mr-3">
                <Clock size={20} className="text-warning-700" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-lg font-semibold text-gray-900">
                  {pendingMeetings.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-success-100 rounded-lg mr-3">
                <CheckCircle2 size={20} className="text-success-700" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-lg font-semibold text-gray-900">
                  {acceptedMeetings.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">This Month</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-7 gap-2 text-xs text-gray-500 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center font-medium">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const count = meetings.filter((meeting) =>
                  isSameDay(parseISO(meeting.startTime), day),
                ).length;

                return (
                  <div
                    key={day.toISOString()}
                    className="rounded-md border border-gray-200 p-2 min-h-16"
                  >
                    <p className="text-xs font-medium text-gray-700">
                      {format(day, "d")}
                    </p>
                    {count > 0 && (
                      <p className="text-xs text-primary-700 mt-1">
                        {count} meeting(s)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">
              Schedule Meeting
            </h2>
          </CardHeader>
          <CardBody>
            <form className="space-y-3" onSubmit={handleScheduleMeeting}>
              <Input
                label="Title"
                placeholder="Investor intro call"
                value={formState.title}
                onChange={handleInputChange("title")}
                required
                fullWidth
              />

              <Input
                label="Invitee User ID"
                placeholder="MongoDB user id"
                value={formState.inviteeId}
                onChange={handleInputChange("inviteeId")}
                required
                fullWidth
              />

              <Input
                label="Start Time"
                type="datetime-local"
                value={formState.startTime}
                onChange={handleInputChange("startTime")}
                required
                fullWidth
              />

              <Input
                label="End Time"
                type="datetime-local"
                value={formState.endTime}
                onChange={handleInputChange("endTime")}
                required
                fullWidth
              />

              <Input
                label="Meeting Link"
                placeholder="https://meet.google.com/..."
                value={formState.meetingLink}
                onChange={handleInputChange("meetingLink")}
                fullWidth
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={3}
                  value={formState.description}
                  onChange={handleInputChange("description")}
                  placeholder="Agenda and context"
                />
              </div>

              <Button
                type="submit"
                fullWidth
                isLoading={isSubmitting}
                leftIcon={<PlusCircle size={16} />}
              >
                Schedule
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">My Meetings</h2>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading meetings...</p>
          ) : meetings.length === 0 ? (
            <p className="text-sm text-gray-500">No meetings found.</p>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => {
                const otherParticipant =
                  user?.id === meeting.hostId ? meeting.invitee : meeting.host;

                return (
                  <div
                    key={meeting.id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {meeting.title}
                        </h3>
                        <Badge variant={statusVariantMap[meeting.status]}>
                          {meeting.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        With: {otherParticipant?.name || meeting.inviteeId}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(meeting.startTime), "PPP p")} -{" "}
                        {format(parseISO(meeting.endTime), "p")}
                      </p>
                      {meeting.meetingLink && (
                        <a
                          href={meeting.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-500"
                        >
                          Open meeting link
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canRespond(meeting) && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => updateMeeting(meeting.id, "accept")}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="error"
                            onClick={() => updateMeeting(meeting.id, "reject")}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {canCancel(meeting) && (
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<XCircle size={16} />}
                          onClick={() => updateMeeting(meeting.id, "cancel")}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

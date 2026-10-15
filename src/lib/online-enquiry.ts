import {
  CONTACT_METHODS,
  ONLINE_EXPERIENCE,
  ONLINE_GOALS,
  TRAINING_PLACES,
  labelFor,
  type ContactMethod,
  type OnlineExperience,
  type OnlineGoal,
  type TrainingPlace,
} from "./booking-options";
import { isSpam, submissionId, text, type FieldErrors, type FieldSource, type ParseResult } from "./booking-request";
import { LIMITS, emailError, instagramError, messageError, nameError, phoneError, singleLine } from "./form-validation";

/**
 * Online coaching enquiries from /online-coaching. Not a booking: Alex reviews
 * the answers and replies personally. Deliberately no health questions.
 */

export interface OnlineEnquiry {
  goal: OnlineGoal;
  goalOther: string;
  experience: OnlineExperience;
  trainingPlace: TrainingPlace | "";
  contactMethod: ContactMethod;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  message: string;
  submissionId: string;
}

export type OnlineField =
  | "goal"
  | "goalOther"
  | "experience"
  | "trainingPlace"
  | "contactMethod"
  | "name"
  | "email"
  | "phone"
  | "instagram"
  | "message";

function oneOf<T extends string>(options: readonly { value: T }[], value: string): value is T {
  return options.some((o) => o.value === value);
}

export function parseOnlineEnquiry(source: FieldSource, now: number = Date.now()): ParseResult<OnlineEnquiry, OnlineField> {
  if (isSpam(source, now)) return { kind: "spam" };

  const errors: FieldErrors<OnlineField> = {};
  const goal = text(source, "goal");
  const goalOther = singleLine(text(source, "goalOther"));
  const experience = text(source, "experience");
  const trainingPlace = text(source, "trainingPlace");
  const contactMethod = text(source, "contactMethod");
  const name = singleLine(text(source, "name"));
  const email = singleLine(text(source, "email")).toLowerCase();
  const phone = singleLine(text(source, "phone"));
  const instagram = singleLine(text(source, "instagram")).replace(/^@?/, "@");
  const message = text(source, "message").replace(/\r\n?/g, "\n");

  if (!oneOf(ONLINE_GOALS, goal)) errors.goal = "Choose your main goal.";
  else if (goal === "other" && !goalOther) errors.goalOther = "Tell Alex what you'd like to achieve.";
  else if (goalOther.length > LIMITS.short) errors.goalOther = "Keep this under 200 characters.";
  if (!oneOf(ONLINE_EXPERIENCE, experience)) errors.experience = "Choose the option that best describes you.";
  if (trainingPlace && !oneOf(TRAINING_PLACES, trainingPlace)) errors.trainingPlace = "Choose where you'll train, or skip it.";
  if (!oneOf(CONTACT_METHODS, contactMethod)) errors.contactMethod = "Choose how Alex should contact you.";

  const nameErr = nameError(name);
  const emailErr = emailError(email);
  const phoneErr = phoneError(phone, contactMethod === "phone");
  const instagramErr = contactMethod === "instagram" ? instagramError(instagram === "@" ? "" : instagram) : undefined;
  const messageErr = messageError(message);
  if (nameErr) errors.name = nameErr;
  if (emailErr) errors.email = emailErr;
  if (phoneErr) errors.phone = phoneErr;
  if (instagramErr) errors.instagram = instagramErr;
  if (messageErr) errors.message = messageErr;

  if (Object.keys(errors).length > 0) return { kind: "invalid", errors };
  return {
    kind: "valid",
    data: {
      goal: goal as OnlineGoal,
      goalOther: goal === "other" ? goalOther : "",
      experience: experience as OnlineExperience,
      trainingPlace: trainingPlace as TrainingPlace | "",
      contactMethod: contactMethod as ContactMethod,
      name,
      email,
      phone,
      instagram: contactMethod === "instagram" ? instagram : "",
      message,
      submissionId: submissionId(source),
    },
  };
}

export function onlineEnquiryEmail(data: OnlineEnquiry): { subject: string; text: string } {
  const goal = data.goal === "other" ? `Something else: ${data.goalOther}` : labelFor(ONLINE_GOALS, data.goal);
  const contact =
    data.contactMethod === "phone"
      ? `Phone (${data.phone})`
      : data.contactMethod === "instagram"
        ? `Instagram (${data.instagram})`
        : "Email";
  const lines = [
    "New online coaching enquiry from the website.",
    "",
    `Main goal: ${goal}`,
    `Experience: ${labelFor(ONLINE_EXPERIENCE, data.experience)}`,
    `Trains: ${data.trainingPlace ? labelFor(TRAINING_PLACES, data.trainingPlace) : "not given"}`,
    `Prefers contact by: ${contact}`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || "not given"}`,
    "",
    "Message:",
    data.message || "(none)",
    "",
    "Reply to this email to answer them directly.",
  ];
  return { subject: `Online coaching enquiry: ${data.name}`.slice(0, 150), text: lines.join("\n") };
}

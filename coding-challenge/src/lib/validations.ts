import { z } from "zod";
import { FORM_CONSTRAINTS } from "./constants";

export const applicationFormSchema = z.object({
  firstName: z
    .string()
    .min(FORM_CONSTRAINTS.NAME_MIN_LENGTH, "First name is required")
    .max(
      FORM_CONSTRAINTS.NAME_MAX_LENGTH,
      `First name must be less than ${FORM_CONSTRAINTS.NAME_MAX_LENGTH} characters`
    )
    .regex(
      /^[a-zA-Z\s\-']+$/,
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  lastName: z
    .string()
    .min(FORM_CONSTRAINTS.NAME_MIN_LENGTH, "Last name is required")
    .max(
      FORM_CONSTRAINTS.NAME_MAX_LENGTH,
      `Last name must be less than ${FORM_CONSTRAINTS.NAME_MAX_LENGTH} characters`
    )
    .regex(
      /^[a-zA-Z\s\-']+$/,
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  email: z
    .string()
    .email("Invalid email address")
    .max(
      FORM_CONSTRAINTS.EMAIL_MAX_LENGTH,
      `Email must be less than ${FORM_CONSTRAINTS.EMAIL_MAX_LENGTH} characters`
    )
    .toLowerCase(),

  phone: z
    .string()
    .optional()
    .refine((phone) => {
      if (!phone || phone.trim() === "") return true;
      return FORM_CONSTRAINTS.PHONE_REGEX.test(phone) && phone.length >= 10;
    }, "Please enter a valid phone number"),

  jobDescription: z
    .string()
    .min(
      FORM_CONSTRAINTS.JOB_DESCRIPTION_MIN_LENGTH,
      `Job description must be at least ${FORM_CONSTRAINTS.JOB_DESCRIPTION_MIN_LENGTH} characters`
    )
    .max(
      FORM_CONSTRAINTS.JOB_DESCRIPTION_MAX_LENGTH,
      `Job description must be less than ${FORM_CONSTRAINTS.JOB_DESCRIPTION_MAX_LENGTH} characters`
    )
    .refine(
      (desc) =>
        desc.trim().length >= FORM_CONSTRAINTS.JOB_DESCRIPTION_MIN_LENGTH,
      "Job description cannot be just whitespace"
    ),
});

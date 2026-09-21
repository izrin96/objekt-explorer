/**
 * Every string on the auth surfaces, copied verbatim out of
 * `apps/website/messages/en.json` so the port can be diffed against it. The
 * lab has no Paraglide, so the message key is the property name with the
 * `auth_` / `common_validation_` prefix dropped where it is unambiguous.
 */
export const AUTH_COPY = {
  /** common_validation_required_name */
  requiredName: "Name is required.",
  /** common_validation_required_email */
  requiredEmail: "Email is required.",
  /** common_validation_required_password */
  requiredPassword: "Password is required.",

  signIn: {
    /** auth_sign_in_title */
    title: "Sign In",
    /** auth_sign_in_description */
    description: "Please enter your credentials to access your account.",
    /** auth_sign_in_email_label */
    emailLabel: "Email",
    /** auth_sign_in_email_placeholder */
    emailPlaceholder: "your@email.com",
    /** auth_sign_in_password_label */
    passwordLabel: "Password",
    /** auth_sign_in_password_placeholder */
    passwordPlaceholder: "•••••••",
    /** auth_sign_in_submit */
    submit: "Sign in with Email",
    /** auth_sign_in_forgot_password */
    forgotPassword: "Forgot password",
    /** auth_sign_in_create_account */
    createAccount: "Create new account",
    /** auth_sign_in_or_continue */
    orContinue: "Or continue with",
    /** auth_sign_in_sign_in_discord */
    discord: "Sign in with Discord",
    /** auth_sign_in_sign_in_twitter */
    twitter: "Sign in with Twitter (X)",
    /** auth_sign_in_success */
    success: "Signed in successfully",
  },

  signUp: {
    /** auth_sign_up_name_label */
    nameLabel: "Name",
    /** auth_sign_up_name_placeholder */
    namePlaceholder: "Your name",
    /** auth_sign_up_email_label */
    emailLabel: "Email",
    /** auth_sign_up_email_placeholder */
    emailPlaceholder: "your@email.com",
    /** auth_sign_up_password_label */
    passwordLabel: "Password",
    /** auth_sign_up_submit */
    submit: "Create Account",
    /** auth_sign_up_back */
    back: "Back to Sign In",
    /** auth_sign_up_success */
    success: "Account created successfully.",
  },

  forgotPassword: {
    /** auth_forgot_password_email_label */
    emailLabel: "Email",
    /** auth_forgot_password_email_placeholder */
    emailPlaceholder: "your@email.com",
    /** auth_forgot_password_submit */
    submit: "Send reset password email",
    /** auth_forgot_password_back */
    back: "Back to Sign In",
    /** auth_forgot_password_success */
    success: "Reset password email sent, check your email",
  },

  resetPassword: {
    /** auth_reset_password_title */
    title: "Reset Password",
    /** auth_reset_password_password_label */
    passwordLabel: "Password",
    /** auth_reset_password_password_placeholder */
    passwordPlaceholder: "•••••••",
    /** auth_reset_password_password_required */
    passwordRequired: "Password is required.",
    /** auth_reset_password_submit */
    submit: "Reset Password",
    /** auth_reset_password_success */
    success: "Password reset successfully",
  },

  verified: {
    /** auth_verified_email_verified */
    emailVerified: "Email has been verified",
    /** auth_account_continue */
    continue: "Continue",
  },
} as const;

/** the lab wires no provider, and every social button says so the same way */
export const NOT_WIRED = "Not wired in the lab";

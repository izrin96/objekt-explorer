import { t, insert, type Dictionary } from "intlayer";

const content = {
  key: "auth",
  content: {
    sign_in: {
      title: t({
        en: "Sign In",
        ko: "로그인",
      }),
      description: t({
        en: "Please enter your credentials to access your account.",
        ko: "계정에 접속하려면 인증 정보를 입력하세요.",
      }),
      email_label: t({
        en: "Email",
        ko: "이메일",
      }),
      email_placeholder: t({
        en: "your@email.com",
        ko: "your@email.com",
      }),
      password_label: t({
        en: "Password",
        ko: "비밀번호",
      }),
      password_placeholder: t({
        en: "•••••••",
        ko: "•••••••",
      }),
      submit: t({
        en: "Sign in with Email",
        ko: "이메일로 로그인",
      }),
      forgot_password: t({
        en: "Forgot password",
        ko: "비밀번호 찾기",
      }),
      create_account: t({
        en: "Create new account",
        ko: "새 계정 만들기",
      }),
      or_continue: t({
        en: "Or continue with",
        ko: "또는 다음으로 계속",
      }),
      sign_in_discord: t({
        en: "Sign in with Discord",
        ko: "Discord로 로그인",
      }),
      sign_in_twitter: t({
        en: "Sign in with Twitter (X)",
        ko: "Twitter (X)로 로그인",
      }),
      success: t({
        en: "Signed in successfully",
        ko: "로그인되었습니다",
      }),
      error: insert(
        t({
          en: "Sign in error. {{message}}",
          ko: "로그인 오류. {{message}}",
        }),
      ),
    },
    sign_up: {
      name_label: t({
        en: "Name",
        ko: "이름",
      }),
      name_placeholder: t({
        en: "Your name",
        ko: "이름을 입력하세요",
      }),
      email_label: t({
        en: "Email",
        ko: "이메일",
      }),
      email_placeholder: t({
        en: "your@email.com",
        ko: "your@email.com",
      }),
      password_label: t({
        en: "Password",
        ko: "비밀번호",
      }),
      submit: t({
        en: "Create Account",
        ko: "계정 만들기",
      }),
      back: t({
        en: "Back to Sign In",
        ko: "로그인으로 돌아가기",
      }),
      success: t({
        en: "Account created successfully.",
        ko: "계정이 생성되었습니다.",
      }),
      error: insert(
        t({
          en: "Account creation error. {{message}}",
          ko: "계정 생성 오류. {{message}}",
        }),
      ),
    },
    forgot_password: {
      email_label: t({
        en: "Email",
        ko: "이메일",
      }),
      email_placeholder: t({
        en: "your@email.com",
        ko: "your@email.com",
      }),
      submit: t({
        en: "Send reset password email",
        ko: "비밀번호 재설정 이메일 보내기",
      }),
      back: t({
        en: "Back to Sign In",
        ko: "로그인으로 돌아가기",
      }),
      success: t({
        en: "Reset password email sent, check your email",
        ko: "비밀번호 재설정 이메일이 전송되었습니다. 이메일을 확인하세요",
      }),
      error: insert(
        t({
          en: "Reset password email request error. {{message}}",
          ko: "비밀번호 재설정 이메일 요청 오류. {{message}}",
        }),
      ),
    },
    reset_password: {
      title: t({
        en: "Reset Password",
        ko: "비밀번호 재설정",
      }),
      password_label: t({
        en: "Password",
        ko: "비밀번호",
      }),
      password_required: t({
        en: "Password is required.",
        ko: "비밀번호를 입력해주세요.",
      }),
      submit: t({
        en: "Reset Password",
        ko: "비밀번호 재설정",
      }),
      success: t({
        en: "Password reset successfully",
        ko: "비밀번호가 재설정되었습니다",
      }),
      error: insert(
        t({
          en: "Password reset error. {{message}}",
          ko: "비밀번호 재설정 오류. {{message}}",
        }),
      ),
      invalid_token: t({
        en: "Invalid token",
        ko: "유효하지 않은 토큰입니다",
      }),
    },
    verified: {
      email_verified: t({
        en: "Email has been verified",
        ko: "이메일이 인증되었습니다",
      }),
    },
    account: {
      title: t({
        en: "Account",
        ko: "계정",
      }),
      description: t({
        en: "Manage your account",
        ko: "계정을 관리하세요",
      }),
      general: t({
        en: "General",
        ko: "일반",
      }),
      change_email: t({
        en: "Change Email",
        ko: "이메일 변경",
      }),
      change_password: t({
        en: "Change Password",
        ko: "비밀번호 변경",
      }),
      social_link: t({
        en: "Social Link",
        ko: "소셜 연결",
      }),
      name_label: t({
        en: "Name",
        ko: "이름",
      }),
      name_placeholder: t({
        en: "Your name",
        ko: "이름을 입력하세요",
      }),
      show_social_label: t({
        en: "Show Social",
        ko: "소셜 표시",
      }),
      show_social_desc: t({
        en: "Display your social account such as Discord username in List and Cosmo profile",
        ko: "목록 및 Cosmo 프로필에 Discord 사용자명과 같은 소셜 계정을 표시합니다",
      }),
      profile_pic_help: t({
        en: "Profile picture can only be set by pulling from X or Discord in the Social Link section below by clicking Refresh.",
        ko: "프로필 사진은 아래 소셜 연결 섹션에서 새로 고침을 클릭하여 X 또는 Discord에서 가져와 설정할 수 있습니다.",
      }),
      save: t({
        en: "Save",
        ko: "저장",
      }),
      current_password_label: t({
        en: "Current Password",
        ko: "현재 비밀번호",
      }),
      current_password_placeholder: t({
        en: "Your current password",
        ko: "현재 비밀번호를 입력하세요",
      }),
      new_password_label: t({
        en: "New Password",
        ko: "새 비밀번호",
      }),
      new_password_placeholder: t({
        en: "Your new password",
        ko: "새 비밀번호를 입력하세요",
      }),
      password_min_length: t({
        en: "Password must be at least 8 characters",
        ko: "비밀번호는 최소 8자 이상이어야 합니다",
      }),
      email_label: t({
        en: "Email",
        ko: "이메일",
      }),
      email_placeholder: t({
        en: "Your email",
        ko: "이메일을 입력하세요",
      }),
      email_verification_desc: t({
        en: "Verification email will be sent to verify your new email address",
        ko: "새 이메일 주소를 확인하기 위한 인증 이메일이 전송됩니다",
      }),
      delete_account_description: t({
        en: "You will be sent a verification email for confirmation. Continue?",
        ko: "확인을 위한 인증 이메일이 전송됩니다. 계속하시겠습니까?",
      }),
      continue: t({
        en: "Continue",
        ko: "계속",
      }),
      account_updated: t({
        en: "Account updated",
        ko: "계정이 업데이트되었습니다",
      }),
      account_update_error: t({
        en: "Error edit account",
        ko: "계정 수정 오류",
      }),
      password_changed: t({
        en: "Password changed successfully",
        ko: "비밀번호가 변경되었습니다",
      }),
      password_change_error: t({
        en: "Error changing password",
        ko: "비밀번호 변경 오류",
      }),
      email_verification_sent: t({
        en: "Email verification has been sent",
        ko: "이메일 인증이 전송되었습니다",
      }),
      email_verification_error: t({
        en: "Error sending email verification",
        ko: "이메일 인증 전송 오류",
      }),
      verification_email_sent: t({
        en: "Verification email sent",
        ko: "인증 이메일이 전송되었습니다",
      }),
      delete_account_error: t({
        en: "Delete account error",
        ko: "계정 삭제 오류",
      }),
      delete_account: t({
        en: "Delete Account",
        ko: "계정 삭제",
      }),
      remove_profile_picture: t({
        en: "Remove Profile Picture",
        ko: "프로필 사진 제거",
      }),
      link_accounts: {
        refresh: t({
          en: "Refresh",
          ko: "새로 고침",
        }),
        unlink: t({
          en: "Unlink",
          ko: "연결 해제",
        }),
        link: t({
          en: "Link",
          ko: "연결",
        }),
        unlinked: insert(
          t({
            en: "{{provider}} unlinked",
            ko: "{{provider}} 연결이 해제되었습니다",
          }),
        ),
        unlink_error: insert(
          t({
            en: "Error unlink from {{provider}}",
            ko: "{{provider}}에서 연결 해제 오류",
          }),
        ),
        profile_updated: t({
          en: "Profile updated",
          ko: "프로필이 업데이트되었습니다",
        }),
        profile_update_error: insert(
          t({
            en: "Error updating profile. {{message}}",
            ko: "프로필 업데이트 오류. {{message}}",
          }),
        ),
        update_profile_title: insert(
          t({
            en: "Update Profile from {{provider}}",
            ko: "{{provider}}에서 프로필 업데이트",
          }),
        ),
        update_profile_desc: insert(
          t({
            en: "This will update your {{provider}} username and profile picture. Continue?",
            ko: "{{provider}} 사용자명과 프로필 사진이 업데이트됩니다. 계속하시겠습니까?",
          }),
        ),
      },
    },
  },
} satisfies Dictionary;

export default content;

"use client"

import {
  LoginForm,
  LoginFormFields,
  PlatformEvent,
} from "@/components/login-form"
import {
  ModeToggle,
  LanguageToggle,
  ColorThemeToggle,
} from "@/components/mode-toggle"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations("LoginPage")
  /**
   * Handle platform event, e.g. Apple or Google login.
   * @param event The platform event, e.g. "apple" or "google".
   */
  function handlePlatformEvent(event: PlatformEvent) {
    toast.error(t(`loginWith${event}NotSupportedYet`), {
      position: "top-center",
      duration: 2000,
    })
  }
  /**
   * Handle form submit, e.g. email login.
   * @param data The login form fields, e.g. email.
   */
  function handleSubmit(data: LoginFormFields) {
    toast.success(t("success.loginSuccessful"), {
      position: "top-center",
      duration: 2000,
      description: t("success.redirectMessage", { email: data.email }),
      onAutoClose: () => {
        router.push("/dashboard")
      },
    })
  }

  return (
    <>
      <div className="absolute top-4 right-4">
        <div className="flex gap-4">
          <ModeToggle />
          <LanguageToggle />
          <ColorThemeToggle />
        </div>
      </div>
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm
            onFormSubmit={handleSubmit}
            onPlatformEvent={handlePlatformEvent}
          />
        </div>
      </div>
    </>
  )
}

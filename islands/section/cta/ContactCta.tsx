/* TODO @REINAMORA:  Update the contact form to be able to send emails */
/* ===== CONTACT CTA COMPONENT ===== */
import { ButtonProcessing } from "$button";
import { InputField } from "$form";
import {
  containerBackground,
  containerGap,
  rowForm,
  rowResponsiveForm,
} from "$layout";
import { subtitleNeutral, text, textLg, titleNeutralLD } from "$text";
import type { FormEventHandler } from "$types/ui.d.ts";
import { useState } from "preact/hooks";

/* ===== STATE ===== */
const ContactCta = () => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ===== EVENT HANDLERS ===== */
  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    // Basic validation
    setIsSubmitting(true);
    setError(
      "Contact form is not setup properly - leave a message on Telegram instead",
    );
    setIsSubmitting(false);
  };

  /* ===== COMPONENT ===== */
  return (
    <>
      <section class={containerBackground}>
        {/* ===== HEADER SECTION ===== */}
        <div class="flex flex-col">
          <h4 class={titleNeutralLD}>
            CONTACT
          </h4>
          <h5 class={subtitleNeutral}>
            DROP US A MESSAGE
          </h5>
        </div>
        {/* ===== CONTENT SECTION ===== */}
        <div class={`flex flex-col mobileLg:flex-row ${containerGap}`}>
          {/* ===== DESCRIPTION TEXT ===== */}
          <div class="w-full mobileLg:w-full">
            <p class={textLg}>
              Reach out if you have any questions about stamps, our tooling and
              services.
            </p>
            <p class={text}>
              Need guidance on deploying a community token or assistance with
              stamping your future art project ?<br />
              Got ideas for a collaboration, improvements or protocol
              integration ?
            </p>
            <p class={text}>
              <a
                href="https://t.me/BitcoinStamps"
                target="_blank"
                class="animated-underline"
              >
                Get in touch via Telegram
              </a>{" "}
              - and let's explore the infinite possibilities of stamps together
              !
            </p>
          </div>

          {/* ===== CONTACT FORM ===== */}
          <div class="hidden w-full mobileLg:w-1/2 pt-3 mobileLg:pt-0">
            <form
              class="flex flex-col gap-6"
              onSubmit={handleSubmit}
            >
              {/* ===== NAME AND EMAIL FIELDS ===== */}
              <div class={rowResponsiveForm}>
                <InputField
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  placeholder="Name"
                />
                <InputField
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  placeholder="Email"
                />
              </div>

              {/* ===== SUBJECT FIELD ===== */}
              <div class={rowForm}>
                <InputField
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.currentTarget.value)}
                  placeholder="Subject"
                />
              </div>

              {/* ===== MESSAGE FIELD ===== */}
              <div class={rowForm}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.currentTarget.value)}
                  class="h-[108px] mobileMd:h-[120px] p-3 rounded-2xl bg-color-grey text-color-grey-dark placeholder:text-color-grey-dark placeholder:uppercase placeholder:font-light text-sm mobileLg:text-base font-medium w-full outline-none focus:bg-color-grey-light"
                  placeholder="Message"
                />
              </div>

              {/* ===== SUBMIT BUTTON ===== */}
              <div class="w-full flex justify-end">
                <ButtonProcessing
                  type="submit"
                  variant="flat"
                  color="grey"
                  size="mdR"
                  isSubmitting={isSubmitting}
                >
                  SEND
                </ButtonProcessing>
              </div>

              {/* ===== ERROR MESSAGE ===== */}
              {error && <p class="text-red-500 mt-2">{error}</p>}
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default ContactCta;

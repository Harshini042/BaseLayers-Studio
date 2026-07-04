const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");

const updateHeader = () => {
  if (!header) {
    return;
  }

  header.classList.toggle("is-scrolled", window.scrollY > 16);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

if (navToggle && navMenu && header) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";

    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navMenu.classList.toggle("is-open", !isOpen);
    header.classList.toggle("is-open", !isOpen);
  });

  navMenu.addEventListener("click", (event) => {
    const clickedLink = event.target.closest("a");

    if (!clickedLink) {
      return;
    }

    navToggle.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("is-open");
    header.classList.remove("is-open");
  });
}

const getJsonResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return {
    ok: false,
    message: response.ok
      ? "The server returned an unexpected response."
      : "The email service is not available. Please try again later."
  };
};

document.querySelectorAll("[data-mail-form]").forEach((form) => {
  const statusMessage = form.querySelector("[data-form-status]");
  const submitButton = form.querySelector('button[type="submit"]');
  const defaultButtonText = submitButton ? submitButton.textContent : "";

  const setStatus = (message, state = "idle") => {
    if (!statusMessage) {
      return;
    }

    statusMessage.textContent = message;
    statusMessage.dataset.state = state;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const fields = {};

    formData.forEach((value, key) => {
      fields[key] = String(value).trim();
    });

    const payload = {
      formType: form.dataset.formType || "project",
      name: fields.name || "",
      email: fields.email || "",
      fields
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    setStatus("Sending your inquiry...", "loading");

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = await getJsonResponse(response);

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Email could not be sent.");
      }

      form.reset();
      setStatus("Thank you. Your inquiry has been sent successfully.", "success");
    } catch (error) {
      setStatus(error.message || "Email could not be sent. Please try again later.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
});

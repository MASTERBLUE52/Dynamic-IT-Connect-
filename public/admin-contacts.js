function renderContacts(contacts) {
  const host = document.getElementById("contacts-list");
  const note = document.getElementById("contacts-note");
  if (!host || !note) return;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    note.textContent = "No client messages found.";
    host.innerHTML = "";
    return;
  }

  note.textContent = `Found ${contacts.length} message(s).`;
  host.innerHTML = `
    <div style="display:grid; gap:12px; margin-top:12px;">
      ${contacts
        .map(
          (item) => `
        <article style="border:1px solid #e6e6e6; border-radius:10px; padding:12px;">
          <p><strong>Name:</strong> ${item.name || "N/A"}</p>
          <p><strong>Email:</strong> ${item.email || "N/A"}</p>
          <p><strong>Message:</strong> ${item.message || "N/A"}</p>
          <p><strong>Date:</strong> ${item.createdAt || "N/A"}</p>
        </article>
      `
        )
        .join("")}
    </div>
  `;
}

async function initContacts() {
  const note = document.getElementById("contacts-note");
  try {
    const res = await fetch("/api/admin/contacts");
    const data = await res.json();
    if (res.status === 401) {
      window.location.href = "/login.html?next=/admin-contacts.html";
      return;
    }
    if (res.status === 403) {
      if (note) note.textContent = "Only admin can view client messages.";
      return;
    }
    if (!res.ok) throw new Error(data.error || "Unable to fetch contacts");
    renderContacts(data.contacts || []);
  } catch (error) {
    if (note) note.textContent = error.message || "Unable to load contacts.";
  }
}

initContacts();

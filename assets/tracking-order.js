(() => {
  const root = document.querySelector("[data-tracking-order]");
  if (!root) return;

  const form = root.querySelector("[data-tracking-form]");
  const input = root.querySelector("[data-tracking-input]");
  const submit = root.querySelector("[data-tracking-submit]");
  const loading = root.querySelector("[data-tracking-loading]");
  const error = root.querySelector("[data-tracking-error]");
  const result = root.querySelector("[data-tracking-result]");
  const status = root.querySelector("[data-tracking-status]");
  const code = root.querySelector("[data-tracking-code]");
  const timeline = root.querySelector("[data-tracking-timeline]");
  const official = root.querySelector("[data-tracking-official]");
  const progress = root.querySelector("[data-tracking-progress]");
  const truck = root.querySelector("[data-tracking-truck]");
  const progressLabel = root.querySelector("[data-tracking-progress-label]");
  const routeStops = Array.from(root.querySelectorAll(".tracking-order__route-stop"));

  const normalize = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const officialUrl = (value) => `https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(value)}`;
  const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const getProgress = (events) => {
    const description = events.map((event) => `${event.description || ""} ${event.detail || ""}`).join(" ").toLowerCase();
    if (/entregue|entrega efetuada/.test(description)) return { value: 100, stage: 3, label: "Pedido entregue" };
    if (/saiu para entrega|em rota de entrega/.test(description)) return { value: 87, stage: 3, label: "Saiu para entrega" };
    if (/em trânsito|encaminhado|transferência/.test(description)) return { value: 63, stage: 2, label: "Em trânsito" };
    if (/triagem|tratamento|recebido na unidade|postado/.test(description)) return { value: 34, stage: 1, label: "Em triagem" };
    return { value: 9, stage: 0, label: "Preparando envio" };
  };

  input.addEventListener("input", () => {
    input.value = normalize(input.value);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const trackingCode = normalize(input.value);
    error.hidden = true;
    result.hidden = true;

    if (!/^[A-Z]{2}\d{9}BR$/.test(trackingCode)) {
      error.textContent = "Confira o código. Exemplo: AD123456789BR.";
      error.hidden = false;
      input.focus();
      return;
    }

    loading.hidden = false;
    submit.disabled = true;

    try {
      const response = await fetch(`${root.dataset.apiUrl}?code=${encodeURIComponent(trackingCode)}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Não foi possível consultar este código agora.");

      status.textContent = data.status || "Objeto pré-postado — aguardando envio";
      code.textContent = data.code;
      official.href = officialUrl(data.code);
      const deliveryProgress = getProgress(data.events || []);
      progress.style.width = `${deliveryProgress.value}%`;
      truck.style.left = `${deliveryProgress.value}%`;
      progressLabel.textContent = deliveryProgress.label;
      routeStops.forEach((stop, index) => stop.classList.toggle("is-active", index <= deliveryProgress.stage));
      timeline.innerHTML = (data.events || []).map((item, index) => `
        <li class="${index === 0 ? "is-current" : ""}">
          <span class="tracking-order__dot"></span>
          <div><strong>${escapeHtml(item.description)}</strong>${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ""}<small>${[item.location, item.date].filter(Boolean).map(escapeHtml).join(" · ")}</small></div>
        </li>`).join("") || "<li class=\"is-current\"><span class=\"tracking-order__dot\"></span><div><strong>Objeto pré-postado</strong><p>O código foi criado e aguardará atualização após a postagem.</p></div></li>";
      result.hidden = false;
    } catch (requestError) {
      error.innerHTML = `${escapeHtml(requestError.message)} <a href="${officialUrl(trackingCode)}" target="_blank" rel="noopener noreferrer">Consultar no portal dos Correios</a>.`;
      error.hidden = false;
    } finally {
      loading.hidden = true;
      submit.disabled = false;
    }
  });
})();

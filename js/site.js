/* Set whatsappReady to true and whatsappNumber to the country code plus
   number, digits only, when the line is live. Example: "6591234567". */
var AUREN = (function () {
  var SITE = {
    whatsappReady: true,
    whatsappNumber: "6584189011"
  };

  var REQUIRED = ["vehicle", "service", "passengers", "luggage", "pickup", "datetime"];
  var ORDER = ["vehicle", "datetime", "service", "hours", "pickup", "dropoff", "flight", "luggage", "passengers"];

  function validate(values, messages, now) {
    var errors = {};
    REQUIRED.forEach(function (key) {
      if (!values[key] || !String(values[key]).trim()) errors[key] = messages[key];
    });
    if (!errors.datetime && values.datetime) {
      var when = new Date(values.datetime);
      var clock = typeof now === "number" ? now : Date.now();
      if (Number.isNaN(when.getTime()) || when.getTime() < clock - 60000) {
        errors.datetime = messages.past;
      }
    }
    return errors;
  }

  function compose(values, labels, greeting, note) {
    var lines = [greeting, ""];
    ORDER.forEach(function (key) {
      var value = values[key];
      if (value == null) return;
      value = String(value).trim();
      if (!value) return;
      if (key === "datetime") value = value.replace("T", " ");
      lines.push(labels[key] + ": " + value);
    });
    if (note && String(note).trim()) {
      lines.push("");
      lines.push(String(note).trim());
    }
    return lines.join("\n").trim();
  }

  function mountLuggage(doc, form) {
    var root = form.querySelector("[data-luggage]");
    if (!root) return;
    var trigger = root.querySelector(".luggage-trigger");
    var panel = root.querySelector(".luggage-panel");
    if (!trigger || !panel) return;

    var bigLabel = root.getAttribute("data-big-label") || "Big";
    var smallLabel = root.getAttribute("data-small-label") || "Small";
    var max = 9;
    var counts = { big: 0, small: 0 };

    function summary() {
      return counts.big + " " + bigLabel + ", " + counts.small + " " + smallLabel;
    }

    function paint() {
      var bigCount = root.querySelector('[data-luggage-count="big"]');
      var smallCount = root.querySelector('[data-luggage-count="small"]');
      if (bigCount) bigCount.textContent = String(counts.big);
      if (smallCount) smallCount.textContent = String(counts.small);
      var text = summary();
      trigger.textContent = text;
      trigger.value = text;
      var decBig = root.querySelector('[data-luggage-dec="big"]');
      var decSmall = root.querySelector('[data-luggage-dec="small"]');
      var incBig = root.querySelector('[data-luggage-inc="big"]');
      var incSmall = root.querySelector('[data-luggage-inc="small"]');
      if (decBig) decBig.disabled = counts.big <= 0;
      if (decSmall) decSmall.disabled = counts.small <= 0;
      if (incBig) incBig.disabled = counts.big >= max;
      if (incSmall) incSmall.disabled = counts.small >= max;
    }

    function place() {
      panel.classList.remove("is-align-end");
      var width = panel.getBoundingClientRect().width;
      var left = trigger.getBoundingClientRect().left;
      var spaceRight = doc.documentElement.clientWidth - left - 8;
      panel.classList.toggle("is-align-end", spaceRight < width);
    }

    function openPanel() {
      panel.hidden = false;
      root.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      place();
    }

    function closePanel(focusTrigger) {
      panel.hidden = true;
      root.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      if (focusTrigger) trigger.focus();
    }

    trigger.addEventListener("click", function () {
      if (panel.hidden) openPanel();
      else closePanel(false);
    });

    panel.addEventListener("click", function (event) {
      var dec = event.target.closest ? event.target.closest("[data-luggage-dec]") : null;
      var inc = event.target.closest ? event.target.closest("[data-luggage-inc]") : null;
      if (dec) {
        var down = dec.getAttribute("data-luggage-dec");
        if (counts[down] > 0) counts[down] -= 1;
        paint();
      }
      if (inc) {
        var up = inc.getAttribute("data-luggage-inc");
        if (counts[up] < max) counts[up] += 1;
        paint();
      }
      if (event.target.closest && event.target.closest("[data-luggage-done]")) closePanel(true);
    });

    doc.addEventListener("click", function (event) {
      if (panel.hidden) return;
      if (root.contains(event.target)) return;
      closePanel(false);
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) closePanel(true);
    });

    doc.defaultView.addEventListener("resize", function () {
      if (!panel.hidden) place();
    });

    paint();
  }

  function mountPassengers(doc, form) {
    var root = form.querySelector("[data-passengers]");
    if (!root) return;
    var trigger = root.querySelector(".luggage-trigger");
    var panel = root.querySelector(".passenger-panel");
    var agesBox = root.querySelector("[data-passenger-ages]");
    if (!trigger || !panel || !agesBox) return;

    var adultOne = root.getAttribute("data-adult-one") || "Adult";
    var adultMany = root.getAttribute("data-adult-many") || "Adults";
    var childOne = root.getAttribute("data-child-one") || "Child";
    var childMany = root.getAttribute("data-child-many") || "Children";
    var ageLabel = root.getAttribute("data-age-label") || "Child {n} Age";
    var agesPrefix = root.getAttribute("data-ages-prefix") || "ages";
    var adultMin = 1;
    var adultMax = 13;
    var childMax = 7;
    var counts = { adults: 1, children: 0 };
    var ages = [];

    function word(count, one, many) {
      return count === 1 ? one : many;
    }

    function summary() {
      return counts.adults + " " + word(counts.adults, adultOne, adultMany) + ", " + counts.children + " " + word(counts.children, childOne, childMany);
    }

    function stored() {
      var text = summary();
      if (!counts.children) return text;
      var parts = [];
      for (var i = 0; i < counts.children; i++) parts.push(ages[i] ? ages[i] : "—");
      return text + " (" + agesPrefix + " " + parts.join(", ") + ")";
    }

    function renderAges() {
      agesBox.textContent = "";
      for (var i = 0; i < counts.children; i++) {
        var select = doc.createElement("select");
        select.className = "passenger-age" + (ages[i] ? " has-value" : "");
        select.setAttribute("data-child-index", String(i));
        select.setAttribute("aria-label", ageLabel.replace("{n}", String(i + 1)));
        var placeholder = doc.createElement("option");
        placeholder.value = "";
        placeholder.textContent = ageLabel.replace("{n}", String(i + 1));
        select.appendChild(placeholder);
        for (var age = 0; age <= 12; age++) {
          var option = doc.createElement("option");
          option.value = String(age);
          option.textContent = String(age);
          select.appendChild(option);
        }
        select.value = ages[i] || "";
        agesBox.appendChild(select);
      }
    }

    function paint() {
      var adultCount = root.querySelector('[data-passenger-count="adults"]');
      var childCount = root.querySelector('[data-passenger-count="children"]');
      if (adultCount) adultCount.textContent = String(counts.adults);
      if (childCount) childCount.textContent = String(counts.children);
      trigger.textContent = summary();
      trigger.value = stored();
      var decAdults = root.querySelector('[data-passenger-dec="adults"]');
      var incAdults = root.querySelector('[data-passenger-inc="adults"]');
      var decChildren = root.querySelector('[data-passenger-dec="children"]');
      var incChildren = root.querySelector('[data-passenger-inc="children"]');
      if (decAdults) decAdults.disabled = counts.adults <= adultMin;
      if (incAdults) incAdults.disabled = counts.adults >= adultMax;
      if (decChildren) decChildren.disabled = counts.children <= 0;
      if (incChildren) incChildren.disabled = counts.children >= childMax;
    }

    function setChildren(next) {
      counts.children = next;
      if (ages.length > counts.children) ages.length = counts.children;
      while (ages.length < counts.children) ages.push("");
      renderAges();
      paint();
    }

    function place() {
      panel.classList.remove("is-align-end");
      var width = panel.getBoundingClientRect().width;
      var left = trigger.getBoundingClientRect().left;
      var spaceRight = doc.documentElement.clientWidth - left - 8;
      panel.classList.toggle("is-align-end", spaceRight < width);
    }

    function openPanel() {
      panel.hidden = false;
      root.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      place();
    }

    function closePanel(focusTrigger) {
      panel.hidden = true;
      root.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      if (focusTrigger) trigger.focus();
    }

    trigger.addEventListener("click", function () {
      if (panel.hidden) openPanel();
      else closePanel(false);
    });

    panel.addEventListener("click", function (event) {
      var dec = event.target.closest ? event.target.closest("[data-passenger-dec]") : null;
      var inc = event.target.closest ? event.target.closest("[data-passenger-inc]") : null;
      if (dec) {
        var down = dec.getAttribute("data-passenger-dec");
        if (down === "adults" && counts.adults > adultMin) counts.adults -= 1;
        if (down === "children" && counts.children > 0) setChildren(counts.children - 1);
        else paint();
      }
      if (inc) {
        var up = inc.getAttribute("data-passenger-inc");
        if (up === "adults" && counts.adults < adultMax) counts.adults += 1;
        if (up === "children" && counts.children < childMax) setChildren(counts.children + 1);
        else paint();
      }
      if (event.target.closest && event.target.closest("[data-passenger-done]")) closePanel(true);
    });

    agesBox.addEventListener("change", function (event) {
      var select = event.target;
      if (!select || select.tagName !== "SELECT") return;
      var index = Number(select.getAttribute("data-child-index"));
      ages[index] = select.value;
      select.classList.toggle("has-value", !!select.value);
      trigger.value = stored();
    });

    doc.addEventListener("click", function (event) {
      if (panel.hidden) return;
      if (root.contains(event.target)) return;
      closePanel(false);
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) closePanel(true);
    });

    doc.defaultView.addEventListener("resize", function () {
      if (!panel.hidden) place();
    });

    paint();
  }

  function mount(doc) {
    var form = doc.querySelector("[data-quote-form]");
    if (!form) return;

    var note = form.querySelector("[data-offline-note]");
    if (note && SITE.whatsappReady) note.hidden = true;

    function setSelect(name, value) {
      var select = form.elements[name];
      if (!select || !value) return;
      var matched = false;
      Array.prototype.forEach.call(select.options, function (option) {
        if (option.value === value) matched = true;
      });
      if (!matched) return;
      select.value = value;
      if (name === "service") syncServiceFields();
      var field = select.closest("[data-field]");
      if (!field) return;
      field.classList.add("is-set");
      doc.defaultView.setTimeout(function () {
        field.classList.remove("is-set");
      }, 1200);
    }

    doc.querySelectorAll("[data-pick-service]").forEach(function (el) {
      el.addEventListener("click", function () {
        setSelect("service", el.getAttribute("data-pick-service"));
      });
    });

    doc.querySelectorAll("[data-pick-vehicle]").forEach(function (el) {
      el.addEventListener("click", function () {
        setSelect("vehicle", el.getAttribute("data-pick-vehicle"));
      });
    });

    var items = doc.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      var button = item.querySelector("button");
      var panel = item.querySelector(".faq-panel");
      if (!button || !panel) return;
      button.addEventListener("click", function () {
        var open = button.getAttribute("aria-expanded") === "true";
        items.forEach(function (other) {
          var otherButton = other.querySelector("button");
          var otherPanel = other.querySelector(".faq-panel");
          if (!otherButton || !otherPanel) return;
          otherButton.setAttribute("aria-expanded", "false");
          otherPanel.hidden = true;
        });
        button.setAttribute("aria-expanded", open ? "false" : "true");
        panel.hidden = open;
      });
    });

    function messages() {
      return {
        vehicle: form.getAttribute("data-err-vehicle"),
        service: form.getAttribute("data-err-service"),
        passengers: form.getAttribute("data-err-passengers"),
        luggage: form.getAttribute("data-err-luggage"),
        pickup: form.getAttribute("data-err-pickup"),
        datetime: form.getAttribute("data-err-datetime"),
        past: form.getAttribute("data-err-past")
      };
    }

    function clearErrors() {
      form.querySelectorAll(".field-error").forEach(function (node) {
        node.hidden = true;
        node.textContent = "";
      });
      form.querySelectorAll("[aria-invalid]").forEach(function (node) {
        node.removeAttribute("aria-invalid");
      });
    }

    function raw(name) {
      var el = form.elements[name];
      return el ? String(el.value || "").trim() : "";
    }

    function shown(name) {
      var el = form.elements[name];
      if (!el) return "";
      if (el.tagName === "SELECT") {
        var option = el.options[el.selectedIndex];
        if (!option || !option.value) return "";
        return option.text;
      }
      return String(el.value || "").trim();
    }

    function labelText(name) {
      var el = form.elements[name];
      if (!el || !el.id) return name;
      var label = form.querySelector('label[for="' + el.id + '"]');
      return label ? label.textContent.replace(/\s+/g, " ").trim() : name;
    }

    var status = form.querySelector("[data-status]");
    var draft = form.querySelector("[data-draft]");

    function syncServiceFields() {
      var service = form.elements.service ? form.elements.service.value : "";
      var hours = form.querySelector('[data-field="hours"]');
      var flight = form.querySelector('[data-field="flight"]');
      if (hours) hours.hidden = service !== "dedicated-hourly";
      if (flight) flight.hidden = service !== "airport";
    }

    syncServiceFields();
    if (form.elements.service) {
      form.elements.service.addEventListener("change", syncServiceFields);
    }

    mountLuggage(doc, form);
    mountPassengers(doc, form);

    form.addEventListener("input", clearOne);
    form.addEventListener("change", clearOne);

    function clearOne(event) {
      var field = event.target.closest ? event.target.closest("[data-field]") : null;
      if (!field) return;
      var noteNode = field.querySelector(".field-error");
      if (noteNode) {
        noteNode.hidden = true;
        noteNode.textContent = "";
      }
      event.target.removeAttribute("aria-invalid");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors();
      if (draft) draft.hidden = true;

      var values = {};
      REQUIRED.concat(["dropoff", "hours", "flight"]).forEach(function (key) {
        values[key] = raw(key);
      });
      if (values.service !== "dedicated-hourly") values.hours = "";
      if (values.service !== "airport") values.flight = "";

      var errors = validate(values, messages());
      var keys = Object.keys(errors);
      if (keys.length) {
        keys.forEach(function (key) {
          var field = form.querySelector('[data-field="' + key + '"]');
          if (!field) return;
          var input = field.querySelector("input, select");
          var noteNode = field.querySelector(".field-error");
          if (noteNode) {
            noteNode.hidden = false;
            noteNode.textContent = errors[key];
            if (input) input.setAttribute("aria-describedby", noteNode.id);
          }
          if (input) input.setAttribute("aria-invalid", "true");
        });
        if (status) {
          status.textContent = form.getAttribute("data-status-invalid");
          status.className = "form-status is-error";
        }
        var first = form.querySelector('[data-field="' + keys[0] + '"] input, [data-field="' + keys[0] + '"] select');
        if (first) first.focus();
        return;
      }

      var display = {};
      var labels = {};
      ORDER.forEach(function (key) {
        display[key] = shown(key);
        labels[key] = labelText(key);
      });
      if (values.service !== "dedicated-hourly") display.hours = "";
      if (values.service !== "airport") display.flight = "";

      var terms = form.querySelector("[data-whatsapp-note]");
      var message = compose(
        display,
        labels,
        form.getAttribute("data-greeting"),
        terms ? terms.textContent : ""
      );
      if (draft) {
        draft.hidden = false;
        draft.textContent = message;
      }

      if (SITE.whatsappReady && SITE.whatsappNumber) {
        if (status) {
          status.textContent = form.getAttribute("data-status-online");
          status.className = "form-status";
        }
        var href = "https://wa.me/" + SITE.whatsappNumber + "?text=" + encodeURIComponent(message);
        doc.defaultView.open(href, "_blank", "noopener,noreferrer");
        return;
      }

      if (status) {
        status.textContent = form.getAttribute("data-status-offline");
        status.className = "form-status";
      }
    });
  }

  return { validate: validate, compose: compose, mount: mount, site: SITE };
})();

if (typeof module === "object" && module.exports) {
  module.exports = AUREN;
}

if (typeof document !== "undefined") {
  AUREN.mount(document);
}

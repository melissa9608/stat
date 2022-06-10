/*global jscolor*/
/*eslint no-undef: "error"*/

const preview = {
  /**
   * Default values - if set to these values, the params do not need to appear in the query string
   */
  defaults: {
    theme: "default",
    hide_border: "false",
    date_format: "",
    locale: "en",
  },

  /**
   * Update the preview with the current parameters
   */
  update: function () {
    // get parameter values from all .param elements
    const params = objectFromElements(document.querySelectorAll(".param"));
    // convert parameters to query string
    const encode = encodeURIComponent;
    const query = Object.keys(params)
      .filter((key) => params[key] !== this.defaults[key])
      .map((key) => encode(key) + "=" + encode(params[key]))
      .join("&");
    // generate links and markdown
    const imageURL = `${window.location.origin}?${query}`;
    const demoImageURL = `preview.php?${query}`;
    const repoLink = "https://git.io/streak-stats";
    const md = `[![GitHub Streak](${imageURL})](${repoLink})`;
    // update image preview
    document.querySelector(".output img").src = demoImageURL;
    // update markdown
    document.querySelector(".md code").innerText = md;
    // disable copy button if username is invalid
    const copyButton = document.querySelector(".copy-button");
    copyButton.disabled = Boolean(document.querySelectorAll("#user:invalid").length);
  },

  /**
   * Add a property in the advanced section
   * @param {string} property - the name of the property, selected element is used if not provided
   * @param {string} value - the value to set the property to
   * @returns {false} false to prevent the default action
   */
  addProperty: function (property, value = "#DD2727FF") {
    const selectElement = document.querySelector("#properties");
    // if no property passed, get the currently selected property
    const propertyName = property || selectElement.value;
    if (!selectElement.disabled) {
      // disable option in menu
      Array.prototype.find.call(selectElement.options, (o) => o.value === propertyName).disabled = true;
      // select first unselected option
      const firstAvailable = Array.prototype.find.call(selectElement.options, (o) => !o.disabled);
      if (firstAvailable) {
        firstAvailable.selected = true;
      } else {
        selectElement.disabled = true;
      }
      // label
      const label = document.createElement("label");
      label.innerText = propertyName;
      label.setAttribute("data-property", propertyName);
      // color picker
      const jscolorConfig = {
        format: "hexa",
        onChange: 'pickerChange(this, "' + propertyName + '")',
        onInput: 'pickerChange(this, "' + propertyName + '")',
      };
      const input = document.createElement("input");
      input.className = "param jscolor";
      input.id = propertyName;
      input.name = propertyName;
      input.setAttribute("data-property", propertyName);
      input.setAttribute("data-jscolor", JSON.stringify(jscolorConfig));
      input.value = value;
      // removal button
      const minus = document.createElement("button");
      minus.className = "minus btn";
      minus.setAttribute("onclick", "return preview.removeProperty(this.getAttribute('data-property'));");
      minus.innerText = "−";
      minus.setAttribute("data-property", propertyName);
      // add elements
      const parent = document.querySelector(".advanced .parameters");
      parent.appendChild(label);
      parent.appendChild(input);
      parent.appendChild(minus);

      //initialise jscolor on element
      jscolor.install(parent);

      // check initial color value
      checkColor(value, propertyName);

      // update and exit
      this.update();
    }
    return false;
  },

  /**
   * Remove a property from the advanced section
   * @param {string} property - the name of the property to remove
   * @returns {false} false to prevent the default action
   */
  removeProperty: function (property) {
    const parent = document.querySelector(".advanced .parameters");
    const selectElement = document.querySelector("#properties");
    // remove all elements for given property
    parent.querySelectorAll(`[data-property="${property}"]`).forEach((x) => parent.removeChild(x));
    // enable option in menu
    const option = Array.prototype.find.call(selectElement.options, (o) => o.value === property);
    selectElement.disabled = false;
    option.disabled = false;
    // update and exit
    this.update();
    return false;
  },
};

const clipboard = {
  /**
   * Copy the content of an element to the clipboard
   * @param {Element} el - the element to copy
   */
  copy: function (el) {
    // create input box to copy from
    const input = document.createElement("input");
    input.value = document.querySelector(".md code").innerText;
    document.body.appendChild(input);
    // select all
    input.select();
    input.setSelectionRange(0, 99999);
    // copy
    document.execCommand("copy");
    // remove input box
    input.parentElement.removeChild(input);
    // set tooltip text
    el.title = "Copied!";
  },
};

const tooltip = {
  /**
   * Reset the tooltip text
   * @param {Element} el - the element to reset the tooltip for
   */
  reset: function (el) {
    // remove tooltip text
    el.removeAttribute("title");
  },
};

/**
 * Create a key-value mapping of ids to values from all elements in a Node list
 * @param {NodeList} elements - the elements to get the values from
 * @returns {Object} the key-value mapping
 */
function objectFromElements(elements) {
  return Array.from(elements).reduce((acc, next) => {
    const obj = { ...acc };
    let value = next.value;
    if (value.indexOf("#") >= 0) {
      // if the value is colour, remove the hash sign
      value = value.replace(/#/g, "");
      if (value.length > 6) {
        // if the value is in hexa and opacity is 1, remove FF
        value = value.replace(/[Ff]{2}$/, "");
      }
    }
    obj[next.id] = value;
    return obj;
  }, {});
}

/**
 * Export the advanced parameters to PHP code for creating a new theme
 */
function exportPhp() {
  const params = objectFromElements(document.querySelectorAll(".advanced .param.jscolor"));
  const output =
    "[\n" +
    Object.keys(params)
      .map((key) => `    "${key}" => "#${params[key]}",\n`)
      .join("") +
    "]";

  const textarea = document.getElementById("exportedPhp");
  textarea.value = output;
  textarea.hidden = false;
}

/**
 * Remove "FF" from a hex color if opacity is 1
 * @param {string} color - the hex color
 * @param {string} input - the property name, or id of the element to update
 */
function checkColor(color, input) {
  if (color.length === 9 && color.slice(-2) === "FF") {
    // if color has hex alpha value -> remove it
    document.getElementById(input).value = color.slice(0, -2);
  }
}

/**
 * Check a color when the picker changes
 * @param {Object} picker - the JSColor picker object
 * @param {string} input - the property name, or id of the element to update
 */
function pickerChange(picker, input) {
  // color was changed by picker - check it
  checkColor(picker.toHEXAString(), input);
}

// refresh preview on interactions with the page
document.addEventListener("keyup", () => preview.update(), false);
document.addEventListener("click", () => preview.update(), false);

// when the page loads
window.addEventListener(
  "load",
  () => {
    // set input boxes to match URL parameters
    new URLSearchParams(window.location.search).forEach((val, key) => {
      const paramInput = document.querySelector(`#${key}`);
      if (paramInput) {
        // set parameter value
        paramInput.value = val;
      } else {
        // add advanced property
        document.querySelector("details.advanced").open = true;
        preview.addProperty(key, val);
      }
    });
    // update previews
    preview.update();
  },
  false
);

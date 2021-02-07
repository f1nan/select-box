const template = document.createElement("template");
template.innerHTML = `
    <style>
        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }
        
        :host {
            font-family: Arial, Helvetica, sans-serif;
            contain: content;
            --primary: hsl(200, 100%, 50%);
            --primary-light: hsl(200, 100%, 70%)
        }

        li {
            padding: 0.25rem 0.5rem;
            cursor: pointer;
        }

        li:hover {
            background-color: var(--primary-light);
            color: white;
        }

        li.selected {
            background-color: var(--primary);
            color: white;
        }
    </style>
    <li>
        <slot></slot>
    </li>
`;

export class SelectBoxOption extends HTMLElement {
    static get observedAttributes() {
        return ["selected"];
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        update(this);
    }

    get value() {
        return this.getAttribute("value");
    }

    set value(value) {
        this.setAttribute("value", value);
    }

    get selected() {
        return this.hasAttribute("selected");
    }

    set selected(value) {
        if (value) {
            this.setAttribute("selected", "");
        } else {
            this.removeAttribute("selected");
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "selected") {
            update(this);
        }
    }
}

function update(selectBoxOption) {
    const li = selectBoxOption.shadowRoot.querySelector("li");
    li.classList.toggle("selected", selectBoxOption.selected);
}

customElements.define("select-box-option", SelectBoxOption);

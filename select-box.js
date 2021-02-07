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
        }

        div {
            outline: none;
            position: relative;
            display: inline-block;
        }

        div:focus > span {
            border-width: 2px;
        }

        span {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 200px;
            border: 1px solid black;
            padding: 0.25rem 0.5rem;
            cursor: pointer;
            user-select: none;
        }

        span::after {
            content: '';
            display: inline-block;
            border: 4px solid transparent;
            border-top-color: black;
            margin-left: 12px;
            margin-top: 4px;
        }

        ul {
            display: none;
            position: absolute;
            padding: 0;
            margin: 0;
            border: 2px solid black;
            border-top: none;
            width: 100%;
            max-height: 200px;
            overflow-y: auto;
        }
        
        ul.show {
            display: block;
        }
    </style>
    <div tabindex="0">
        <span></span>
        <ul>
            <slot></slot>
        </ul>
    </div>
`;

export class SelectBox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        whenSelectBoxOptionsDefined(this).then(initialize);
    }

    get options() {
        return [...this.querySelectorAll("select-box-option")];
    }

    get selectedOption() {
        return this.options.find((o) => o.selected);
    }

    selectValue(value) {
        const newSelectedOption = this.options.find((o) => o.value === value);
        if (typeof newSelectedOption === "undefined") {
            throw new Error(`${value} does not exist`);
        }

        const prevSelectedOption = this.selectedOption;
        if (prevSelectedOption) {
            prevSelectedOption.selected = false;
        }

        newSelectedOption.selected = true;

        const label = this.shadowRoot.querySelector("span");
        label.innerText = newSelectedOption.innerText;
    }

    connectedCallback() {
        this.addEventListener("click", this._handleClick);
        this.addEventListener("blur", this._handleBlur);
    }

    disconnectedCallback() {
        this.removeEventListener("click", this._handleClick);
        this.removeEventListener("blur", this._handleBlur);
    }

    _handleClick = (e) => {
        if (e.target.tagName === "SELECT-BOX-OPTION") {
            this.selectValue(e.target.value);
        }

        optionsList(this).toggleVisibility();
    };

    _handleBlur = (e) => {
        optionsList(this).hide();
    };
}

function optionsList(selectBox) {
    const ul = selectBox.shadowRoot.querySelector("ul");
    return {
        toggleVisibility() {
            ul.classList.toggle("show");
        },
        hide() {
            ul.classList.remove("show");
        },
    };
}

async function whenSelectBoxOptionsDefined(selectBox) {
    await Promise.all(
        selectBox.options.map((o) => customElements.whenDefined(o.localName))
    );
    return selectBox;
}

function initialize(selectBox) {
    const selectedOption = selectBox.selectedOption || selectBox.options[0];
    if (!selectedOption) {
        return;
    }

    selectedOption.selected = true;
    selectBox.shadowRoot.querySelector("span").innerText =
        selectedOption.innerText;
}

customElements.define("select-box", SelectBox);

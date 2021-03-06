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

        div:focus > span,
        div.open > span {
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
            outline: none;
            border: 2px solid black;
            border-top: none;
            width: 100%;
            max-height: 200px;
            overflow-y: auto;
        }
        
        div.open > ul {
            display: block;
        }
    </style>
    <div>
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

        // Wait with initialization until the custom element select box option is defined. Otherwise
        // properties of select box option elements are undefined.
        whenSelectBoxOptionsDefined(this).then(initialize);

        this._debounceSearch = new DebounceSearch();
    }

    get options() {
        return [...this.querySelectorAll("select-box-option")];
    }

    get selectedOption() {
        return this.options.find((o) => o.selected);
    }

    get selectedOptionIndex() {
        return this.options.indexOf(this.selectedOption);
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
        newSelectedOption.scrollIntoView({ block: "nearest" });

        const label = this.shadowRoot.querySelector("span");
        label.innerText = newSelectedOption.innerText;
    }

    connectedCallback() {
        this.addEventListener("focus", this._handleFocus);
        this.addEventListener("blur", this._handleBlur);
        this.addEventListener("click", this._handleClick);
        this.addEventListener("keydown", this._handleKeydown);
    }

    disconnectedCallback() {
        this.removeEventListener("focus", this._handleFocus);
        this.removeEventListener("blur", this._handleBlur);
        this.removeEventListener("click", this._handleClick);
        this.removeEventListener("keydown", this._handleKeydown);
    }

    _handleFocus = (e) => {
        this.shadowRoot.querySelector("div").focus();
    };

    _handleBlur = (e) => {
        const optionsContainer = getOptionsContainer(this);
        if (optionsContainer.isVisible) {
            optionsContainer.hide();
            this.focus();
        }
    };

    _handleClick = (e) => {
        if (e.target.tagName === "SELECT-BOX-OPTION") {
            this.selectValue(e.target.value);
        }

        getOptionsContainer(this).toggleVisibility();
    };

    _handleKeydown = (e) => {
        const handler = createKeydownHandler(this, e, this._debounceSearch);
        handler.handle();
    };
}

function createKeydownHandler(selectBox, event, debounceSearch) {
    const { code, key } = event;
    switch (code) {
        case "Space":
            return new SpaceHandler(selectBox, key, debounceSearch);
        case "ArrowUp":
            return new ArrowUpHandler(selectBox, key, debounceSearch);
        case "ArrowDown":
            return new ArrowDownHandler(selectBox, key, debounceSearch);
        case "Enter":
        case "Escape":
            return new EnterHandler(selectBox, key, debounceSearch);
        default:
            return new DefaultHandler(selectBox, key, debounceSearch);
    }
}

class DebounceSearch {
    constructor() {
        this._searchTerm = "";
        this._timeout = null;
    }

    appendToSearchTerm(text) {
        this._searchTerm += String(text).toLowerCase();
    }

    search(options) {
        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            this._searchTerm = "";
        }, 500);

        return options.find((o) =>
            o.innerText.toLowerCase().startsWith(this._searchTerm)
        );
    }
}

class KeydownHandler {
    constructor(selectBox, key, debounceSearch) {
        this._selectBox = selectBox;
        this._key = key;
        this._debounceSearch = debounceSearch;
    }

    get key() {
        return this._key;
    }

    get selectBox() {
        return this._selectBox;
    }

    handle() {
        throw new Error("Not implemented");
    }
}

class SpaceHandler extends KeydownHandler {
    handle() {
        getOptionsContainer(this.selectBox).toggleVisibility();
    }
}

class ArrowUpHandler extends KeydownHandler {
    handle() {
        const previousOption = this.selectBox.options[
            this.selectBox.selectedOptionIndex - 1
        ];
        if (previousOption) {
            this.selectBox.selectValue(previousOption.value);
        }
    }
}

class ArrowDownHandler extends KeydownHandler {
    handle() {
        const nextOption = this.selectBox.options[
            this.selectBox.selectedOptionIndex + 1
        ];
        if (nextOption) {
            this.selectBox.selectValue(nextOption.value);
        }
    }
}

class EnterHandler extends KeydownHandler {
    handle() {
        getOptionsContainer(this.selectBox).hide();
    }
}

class DefaultHandler extends KeydownHandler {
    handle() {
        this._debounceSearch.appendToSearchTerm(this.key);
        const searchedOption = this._debounceSearch.search(
            this.selectBox.options
        );

        if (searchedOption) {
            this.selectBox.selectValue(searchedOption.value);
        }
    }
}

function getOptionsContainer(selectBox) {
    const div = selectBox.shadowRoot.querySelector("div");
    return {
        get isVisible() {
            return div.classList.contains("open");
        },
        toggleVisibility() {
            div.classList.toggle("open");
        },
        hide() {
            div.classList.remove("open");
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
    selectBox.tabIndex = 0;

    const selectedOption = selectBox.selectedOption || selectBox.options[0];
    if (!selectedOption) {
        return;
    }

    selectedOption.selected = true;
    selectBox.shadowRoot.querySelector("span").innerText =
        selectedOption.innerText;
}

customElements.define("select-box", SelectBox);

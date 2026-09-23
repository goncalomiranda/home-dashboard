declare global {
    interface Window {
        bootstrap: {
            Tooltip: new (element: Element, options?: object) => {
                show(): void;
                hide(): void;
                toggle(): void;
                dispose(): void;
            };
            Toast: new (element: Element, options?: object) => {
                show(): void;
                hide(): void;
                dispose(): void;
            };
            Modal: new (element: Element, options?: object) => {
                show(): void;
                hide(): void;
                toggle(): void;
                dispose(): void;
            };
            Dropdown: new (element: Element, options?: object) => {
                show(): void;
                hide(): void;
                toggle(): void;
                dispose(): void;
            };
            Collapse: new (element: Element, options?: object) => {
                show(): void;
                hide(): void;
                toggle(): void;
                dispose(): void;
            };
            Offcanvas: new (element: Element, options?: object) => {
                show(): void;
                hide(): void;
                toggle(): void;
                dispose(): void;
            };
            Popover: new (element: Element, options?: object) => {
                show(): void;
                hide(): void;
                toggle(): void;
                dispose(): void;
            };
            Tab: new (element: Element, options?: object) => {
                show(): void;
                hide(): void;
                dispose(): void;
            };
            Button: new (element: Element) => {
                toggle(): void;
                dispose(): void;
            };
            Alert: new (element: Element) => {
                close(): void;
                dispose(): void;
            };
            Carousel: new (element: Element, options?: object) => {
                cycle(): void;
                pause(): void;
                prev(): void;
                next(): void;
                nextWhenVisible(): void;
                to(index: number): void;
                dispose(): void;
            };
        };
    }

    // Make bootstrap available globally
    declare const bootstrap: Window['bootstrap'];
}

export { };
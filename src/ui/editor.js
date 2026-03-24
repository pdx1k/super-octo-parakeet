import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';

export class BehaviorEditor {
  constructor(containerEl, initialSource, onSave) {
    this._onSave = onSave;
    this._container = containerEl;

    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        run: (view) => {
          onSave(view.state.doc.toString());
          return true;
        },
      },
    ]);

    this.view = new EditorView({
      doc: initialSource,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        saveKeymap,
      ],
      parent: containerEl,
    });

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply Behavior (Ctrl+S)';
    applyBtn.className = 'apply-behavior-btn';
    applyBtn.addEventListener('click', () => {
      onSave(this.view.state.doc.toString());
    });
    containerEl.appendChild(applyBtn);
  }

  getValue() {
    return this.view.state.doc.toString();
  }

  setValue(src) {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: src },
    });
  }

  destroy() {
    this.view.destroy();
  }
}

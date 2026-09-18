"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";

interface ConfirmOptions {
  title: string;
  description?: string;
  /** Names the action, e.g. "Delete document" — never "OK". */
  confirmLabel: string;
  cancelLabel?: string;
}

/**
 * In-app replacement for window.confirm:
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (!(await confirm({ title, confirmLabel }))) return;
 *   ...render {confirmDialog} once in the component.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirmDialog = (
    <Dialog
      open={options !== null}
      onClose={() => settle(false)}
      title={options?.title}
      description={options?.description}
      size="sm"
    >
      <div className="mt-2 flex justify-end gap-2">
        {/* Cancel takes focus so Enter never destroys anything by accident */}
        <Button variant="outline" data-autofocus onClick={() => settle(false)}>
          {options?.cancelLabel ?? "Cancel"}
        </Button>
        <Button variant="danger" onClick={() => settle(true)}>
          {options?.confirmLabel}
        </Button>
      </div>
    </Dialog>
  );

  return { confirm, confirmDialog };
}

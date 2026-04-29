'use client';

import { useTranslations } from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';

interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteModal({ open, onOpenChange, onConfirm, loading }: DeleteModalProps) {
  const t = useTranslations();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 rounded-3xl border border-white/8 shadow-2xl p-8 max-w-md w-full mx-4 z-50">
          {loading ? (
            <>
              <Dialog.Title className="text-xl font-semibold text-white mb-6">
                {t('deleting_old_builds')}
              </Dialog.Title>
              <div className="flex justify-center items-center py-8">
                <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
              </div>
            </>
          ) : (
            <>
              <Dialog.Title className="text-xl font-semibold text-white mb-4">
                {t('confirm_delete')}
              </Dialog.Title>
              <Dialog.Description className="text-slate-300 mb-6">
                {t('confirm_delete_message')}
              </Dialog.Description>
              <div className="flex gap-3">
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 bg-slate-700 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-slate-600 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 bg-gradient-to-br from-red-600 to-red-500 text-white px-6 py-2.5 rounded-full font-semibold hover:shadow-[0_10px_24px_rgba(239,68,68,0.35)] transition-all"
                >
                  {t('delete')}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


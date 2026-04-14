'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type BuyCreditsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BuyCreditsDialog({ open, onOpenChange }: BuyCreditsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>All AI Modules Are Free</DialogTitle>
          <DialogDescription>
            Credit packs and premium plans were removed. Every AI feature is already unlocked for your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

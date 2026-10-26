import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@documenso/ui/primitives/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@documenso/ui/primitives/form/form';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router';
import { z } from 'zod';

const ZRejectDocumentFormSchema = z.object({
  reason: z.string().max(500, msg`Reason must be less than 500 characters`),
});

type TRejectDocumentFormSchema = z.infer<typeof ZRejectDocumentFormSchema>;

export interface DocumentSigningRejectDialogProps {
  documentId: number;
  token: string;
  onRejected?: (reason: string) => void | Promise<void>;
  trigger?: React.ReactNode;
}

export function DocumentSigningRejectDialog({
  documentId,
  token,
  onRejected,
  trigger,
}: DocumentSigningRejectDialogProps) {
  const { t } = useLingui();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);

  const { mutateAsync: rejectDocumentWithToken } = trpc.recipient.rejectDocumentWithToken.useMutation();

  const form = useForm<TRejectDocumentFormSchema>({
    resolver: zodResolver(ZRejectDocumentFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  const onRejectDocument = async ({ reason }: TRejectDocumentFormSchema) => {
    try {
      await rejectDocumentWithToken({
        documentId,
        token,
        reason,
      });

      toast({
        title: t`Document rejected`,
        description: t`The document has been successfully rejected.`,
        duration: 5000,
      });

      setIsOpen(false);

      if (onRejected) {
        await onRejected(reason);
      } else {
        window.location.href = `/sign/${token}/rejected`;
      }
    } catch (err) {
      toast({
        title: t`Error`,
        description: t`An error occurred while rejecting the document. Please try again.`,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  useEffect(() => {
    if (searchParams?.get('reject') === 'true') {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-primary text-primary hover:text-primary"
          >
            <Trans>Reject Document</Trans>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Are you sure you want to reject the DOR?</Trans>
          </DialogTitle>

          <DialogDescription></DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onRejectDocument)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder={t`Please provide a reason for rejecting this document`}
                      disabled={form.formState.isSubmitting}
                      aria-label={t`Reason for rejecting the DOR`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full border-primary text-primary hover:text-primary md:w-1/2"
                onClick={() => setIsOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                <Trans>Cancel</Trans>
              </Button>

              <Button
                type="submit"
                variant="default"
                className="!m-0 w-full md:w-1/2"
                loading={form.formState.isSubmitting}
                disabled={!form.formState.isValid}
              >
                <Trans>Reject Document</Trans>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

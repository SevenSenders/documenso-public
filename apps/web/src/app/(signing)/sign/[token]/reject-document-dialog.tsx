'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Document } from '@documenso/prisma/client';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@documenso/ui/primitives/form/form';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { useToast } from '@documenso/ui/primitives/use-toast';

const ZRejectDocumentFormSchema = z.object({
  reason: z
    .string()
    .min(5, msg`Please provide a reason`)
    .max(500, msg`Reason must be less than 500 characters`),
});

type TRejectDocumentFormSchema = z.infer<typeof ZRejectDocumentFormSchema>;

export interface RejectDocumentDialogProps {
  document: Pick<Document, 'id'>;
  token: string;
  onRejected?: (reason: string) => void | Promise<void>;
}

export function RejectDocumentDialog({ document, token, onRejected }: RejectDocumentDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { _ } = useLingui();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);

  const { mutateAsync: rejectDocumentWithToken } =
    trpc.recipient.rejectDocumentWithToken.useMutation();

  const form = useForm<TRejectDocumentFormSchema>({
    resolver: zodResolver(ZRejectDocumentFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  const onRejectDocument = async ({ reason }: TRejectDocumentFormSchema) => {
    try {
      // TODO: Add trpc mutation here
      await rejectDocumentWithToken({
        documentId: document.id,
        token,
        reason,
      });

      toast({
        title: 'Document rejected',
        description: 'The document has been successfully rejected.',
        duration: 5000,
      });

      setIsOpen(false);

      if (onRejected) {
        await onRejected(reason);
      } else {
        router.push(`/sign/${token}/rejected`);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An error occurred while rejecting the document. Please try again.',
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
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="border-primary text-primary hover:text-primary w-full"
        >
          <Trans>Reject Document</Trans>
        </Button>
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
                      placeholder={_(msg`Please provide a reason for rejecting this document`)}
                      disabled={form.formState.isSubmitting}
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
                className="border-primary text-primary hover:text-primary w-full md:w-1/2"
                onClick={() => setIsOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                <Trans>Cancel</Trans>
              </Button>
              <Button
                type="submit"
                className="!m-0 w-full md:w-1/2"
                variant="default"
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

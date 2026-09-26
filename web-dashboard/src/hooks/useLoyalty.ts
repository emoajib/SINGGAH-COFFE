// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoyaltyService, SubmitFeedbackPayload, RedeemRewardPayload } from '../services/loyaltyService';
import { useToast } from './use-toast';
import type { LoyaltyProgram } from '../types';

export const usePublicLoyaltyCard = (token: string) => {
    return useQuery({
        queryKey: ['public-loyalty', token],
        queryFn: () => LoyaltyService.getPublicCard(token),
        enabled: !!token,
        staleTime: 10000,
    });
};

export const useCustomers = () => {
    return useQuery({
        queryKey: ['customers'],
        queryFn: LoyaltyService.getCustomers,
        staleTime: 30000,
    });
};

export const useLoyaltyPrograms = () => {
    return useQuery({
        queryKey: ['loyalty-programs'],
        queryFn: LoyaltyService.getPrograms,
        staleTime: 60000,
    });
};

export const useFeedbacks = (status?: string) => {
    return useQuery({
        queryKey: ['customer-feedbacks', status],
        queryFn: () => LoyaltyService.getFeedbacks(status),
        staleTime: 15000,
    });
};

export const useLoyaltyMutations = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const submitFeedback = useMutation({
        mutationFn: ({ token, payload }: { token: string; payload: SubmitFeedbackPayload }) =>
            LoyaltyService.submitFeedback(token, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public-loyalty'] });
            toast({
                title: 'Masukan Terkirim',
                description: 'Terima kasih atas kritik & saran Anda untuk kemajuan Singgah Coffee!',
                variant: 'success',
            });
        },
        onError: (err: unknown) => {
            const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal mengirim masukan';
            toast({
                title: 'Gagal Mengirim',
                description: errorMsg,
                variant: 'error',
            });
        }
    });

    const redeemReward = useMutation({
        mutationFn: (payload: RedeemRewardPayload) => LoyaltyService.redeemReward(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['public-loyalty'] });
            toast({
                title: 'Reward Berhasil Ditukar',
                description: 'Stempel telah diproses dan reward siap diserahkan kepada pelanggan.',
                variant: 'success',
            });
        },
        onError: (err: unknown) => {
            const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal menukarkan reward';
            toast({
                title: 'Penukaran Gagal',
                description: errorMsg,
                variant: 'error',
            });
        }
    });

    const createProgram = useMutation({
        mutationFn: (prog: Partial<LoyaltyProgram>) => LoyaltyService.createProgram(prog),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['loyalty-programs'] });
            toast({
                title: 'Program Berhasil Dibuat',
                description: 'Program loyalitas stempel baru telah aktif.',
                variant: 'success',
            });
        },
        onError: (err: unknown) => {
            const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal membuat program';
            toast({
                title: 'Peringatan',
                description: errorMsg,
                variant: 'error',
            });
        }
    });

    const replyFeedback = useMutation({
        mutationFn: ({ id, reply }: { id: number; reply: string }) =>
            LoyaltyService.replyFeedback(id, reply),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-feedbacks'] });
            toast({
                title: 'Balasan Terkirim',
                description: 'Balasan telah disimpan dan dapat dilihat oleh pelanggan.',
                variant: 'success',
            });
        },
        onError: (err: unknown) => {
            const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal mengirim balasan';
            toast({
                title: 'Peringatan',
                description: errorMsg,
                variant: 'error',
            });
        }
    });

    return {
        submitFeedback,
        redeemReward,
        createProgram,
        replyFeedback,
    };
};

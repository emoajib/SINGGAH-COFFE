// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderQueueService, KitchenStatus } from '../services/orderQueueService';
import { useToast } from './use-toast';

export const useOrderQueue = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Query antrian dengan polling 4 detik aman (hanya aktif jika window sedang aktif)
    const queueQuery = useQuery({
        queryKey: ['kitchen-queue'],
        queryFn: OrderQueueService.getActiveQueue,
        refetchInterval: 4000,
        refetchIntervalInBackground: false,
        staleTime: 2000,
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ orderId, status, notes }: { orderId: number; status: KitchenStatus; notes?: string }) =>
            OrderQueueService.updateStatus(orderId, { kitchen_status: status, preparation_notes: notes }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
            const statusLabels: Record<KitchenStatus, string> = {
                queued: 'Masuk Antrian',
                preparing: 'Sedang Diracik',
                ready: 'Siap Disajikan',
                served: 'Selesai Disajikan'
            };
            toast({
                title: 'Status Pesanan Diperbarui',
                description: `Pesanan diubah menjadi: ${statusLabels[variables.status]}`,
                variant: 'success',
            });
        },
        onError: (err: unknown) => {
            const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal memperbarui status antrian';
            toast({
                title: 'Peringatan',
                description: errorMsg,
                variant: 'error',
            });
        }
    });

    const clearOldQueueMutation = useMutation({
        mutationFn: OrderQueueService.clearOldQueue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
            toast({
                title: 'Antrian Lampau Dibersihkan',
                description: 'Semua pesanan sebelum hari ini berhasil diarsipkan.',
                variant: 'success',
            });
        },
        onError: (err: unknown) => {
            const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal membersihkan antrian lampau';
            toast({
                title: 'Peringatan',
                description: errorMsg,
                variant: 'error',
            });
        }
    });

    return {
        orders: queueQuery.data || [],
        isLoading: queueQuery.isLoading,
        isError: queueQuery.isError,
        refetch: queueQuery.refetch,
        updateStatus: updateStatusMutation.mutate,
        isUpdating: updateStatusMutation.isPending,
        clearOldQueue: clearOldQueueMutation.mutate,
        isClearing: clearOldQueueMutation.isPending,
    };
};

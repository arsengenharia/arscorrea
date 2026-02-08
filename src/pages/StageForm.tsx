import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useState } from "react";
import { queryClient } from "@/lib/query-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const addStageFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  status: z.string().optional(),
  report: z.string().optional(),
  report_start_date: z.date().optional(),
  report_end_date: z.date().optional(),
  photos: z.any().optional(),
});

type AddStageFormValues = z.infer<typeof addStageFormSchema>;

export default function StageForm() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  const form = useForm<AddStageFormValues>({
    resolver: zodResolver(addStageFormSchema),
    defaultValues: {
      status: "pendente",
      report_start_date: undefined,
      report_end_date: undefined,
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileNames = Array.from(e.target.files).map(file => file.name);
      setSelectedFiles(fileNames);
      form.setValue('photos', e.target.files);
    }
  };

  const { mutate: createStage, isPending } = useMutation({
    mutationFn: async (values: AddStageFormValues) => {
      try {
        setIsUploading(true);
        
        // Format dates in ISO format to preserve exact date without timezone issues
        const formattedData = {
          name: values.name,
          status: values.status || "pendente",
          report: values.report,
          project_id: projectId,
          report_start_date: values.report_start_date ? values.report_start_date.toISOString().split('T')[0] : null,
          report_end_date: values.report_end_date ? values.report_end_date.toISOString().split('T')[0] : null,
        };
        
        console.log("Saving dates:", {
          start: formattedData.report_start_date,
          end: formattedData.report_end_date
        });
        
        const { data: stage, error: stageError } = await supabase
          .from("stages")
          .insert(formattedData)
          .select()
          .single();
        
        if (stageError) throw stageError;

        if (values.photos && values.photos.length > 0) {
          const photos = Array.from(values.photos as FileList);
          let completed = 0;

          for (const photo of photos) {
            if (photo.size > MAX_FILE_SIZE) {
              throw new Error(`O arquivo ${photo.name} é muito grande. Máximo 5MB`);
            }

            const fileExt = photo.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('stages')
              .upload(`${stage.id}/${fileName}`, photo);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from('stages')
              .getPublicUrl(`${stage.id}/${fileName}`);

            const { error: photoError } = await supabase
              .from('stage_photos')
              .insert({
                stage_id: stage.id,
                photo_url: urlData.publicUrl
              });

            if (photoError) throw photoError;

            completed++;
            setUploadProgress((completed / photos.length) * 100);
          }
        }
        
        setIsUploading(false);
        return true;
      } catch (error) {
        console.error('Error creating stage:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Etapa adicionada com sucesso!");
      navigate(`/obras/${projectId}`);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error("Erro ao adicionar etapa");
      setIsUploading(false);
    },
  });

  function onSubmit(values: AddStageFormValues) {
    createStage(values);
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Adicionar Etapa</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Etapa</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da etapa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="iniciado">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="report_start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data início do relatório</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="report_end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data fim do relatório</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="report"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relatório</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva os detalhes desta etapa"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="photos"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Fotos</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      {...field}
                    />
                  </FormControl>
                  {selectedFiles.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">Arquivos selecionados:</p>
                      <ul className="text-sm text-gray-600 list-disc pl-5">
                        {selectedFiles.map((fileName, index) => (
                          <li key={index}>{fileName}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {isUploading && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Enviando fotos...</div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={isPending || isUploading}>
                {isUploading ? "Enviando..." : "Adicionar Etapa"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/obras/${projectId}`)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}


import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings as SettingsIcon, FileType, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface UserSettings {
  auto_save: boolean;
  language: string;
  voice_id: string;
  default_doc_format: string;
  auto_transcribe: boolean;
}

const Settings = () => {
  const [autoSave, setAutoSave] = useState(true);
  const [language, setLanguage] = useState("en");
  const [voiceId, setVoiceId] = useState("pFZP5JQG7iQjIQuC4Bku");
  const [defaultDocFormat, setDefaultDocFormat] = useState("docx");
  const [autoTranscribe, setAutoTranscribe] = useState(true);

  const { data: settings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserSettings | null;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  useEffect(() => {
    if (settings) {
      setAutoSave(settings.auto_save ?? true);
      setLanguage(settings.language ?? "en");
      setVoiceId(settings.voice_id ?? "pFZP5JQG7iQjIQuC4Bku");
      setDefaultDocFormat(settings.default_doc_format ?? "docx");
      setAutoTranscribe(settings.auto_transcribe ?? true);
    }
  }, [settings]);

  const handleAutoSaveChange = (checked: boolean) => {
    setAutoSave(checked);
    updateSettingsMutation.mutate({ auto_save: checked });
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    updateSettingsMutation.mutate({ language: value });
  };

  const handleVoiceChange = (value: string) => {
    setVoiceId(value);
    updateSettingsMutation.mutate({ voice_id: value });
  };

  const handleDocFormatChange = (value: string) => {
    setDefaultDocFormat(value);
    updateSettingsMutation.mutate({ default_doc_format: value });
  };

  const handleAutoTranscribeChange = (checked: boolean) => {
    setAutoTranscribe(checked);
    updateSettingsMutation.mutate({ auto_transcribe: checked });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] to-[#13151C] text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-[#9b87f5]" />
          <div>
            <h1 className="text-3xl font-semibold mb-1">Settings</h1>
            <p className="text-sm text-gray-400">Customize your VoxNote experience</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* General Settings */}
          <div className="bg-[#222837] rounded-2xl p-6 shadow-lg border border-white/5">
            <h2 className="text-xl font-medium mb-6">General Settings</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto-save consultations</Label>
                  <p className="text-sm text-gray-400">
                    Automatically save your consultation progress
                  </p>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={handleAutoSaveChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-full bg-[#2A3041] border-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="bg-[#222837] rounded-2xl p-6 shadow-lg border border-white/5">
            <div className="flex items-center gap-2 mb-6">
              <Volume2 className="w-5 h-5 text-[#9b87f5]" />
              <h2 className="text-xl font-medium">Voice Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>AI Voice</Label>
                <Select value={voiceId} onValueChange={handleVoiceChange}>
                  <SelectTrigger className="w-full bg-[#2A3041] border-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pFZP5JQG7iQjIQuC4Bku">Lily (Default)</SelectItem>
                    <SelectItem value="alternative1">Voice 2</SelectItem>
                    <SelectItem value="alternative2">Voice 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto-transcribe</Label>
                  <p className="text-sm text-gray-400">
                    Automatically transcribe voice to text during consultations
                  </p>
                </div>
                <Switch
                  checked={autoTranscribe}
                  onCheckedChange={handleAutoTranscribeChange}
                />
              </div>
            </div>
          </div>

          {/* Document Settings */}
          <div className="bg-[#222837] rounded-2xl p-6 shadow-lg border border-white/5">
            <div className="flex items-center gap-2 mb-6">
              <FileType className="w-5 h-5 text-[#9b87f5]" />
              <h2 className="text-xl font-medium">Document Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Default Document Format</Label>
                <Select value={defaultDocFormat} onValueChange={handleDocFormatChange}>
                  <SelectTrigger className="w-full bg-[#2A3041] border-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docx">Word Document (.docx)</SelectItem>
                    <SelectItem value="pdf">PDF Document (.pdf)</SelectItem>
                    <SelectItem value="txt">Text File (.txt)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-400">
                  Choose the default format for downloading consultation notes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

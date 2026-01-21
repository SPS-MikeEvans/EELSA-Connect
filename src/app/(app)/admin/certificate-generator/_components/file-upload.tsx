import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileSelect: (content: string, fileName: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileSelect(content, file.name);
      };
      reader.readAsText(file);
    } else if (file) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid SVG file.",
        variant: "destructive",
      });
    }
  }, [onFileSelect]);

  return (
    <div className="w-full">
      <label 
        htmlFor="svg-upload" 
        className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white hover:bg-gray-50 transition-colors duration-200"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloud className="w-12 h-12 mb-3 text-indigo-500" />
          <p className="mb-2 text-sm text-gray-500 font-medium">
            <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-400">SVG Certificates (must contain {`{{Name}}`})</p>
        </div>
        <input 
          id="svg-upload" 
          type="file" 
          accept=".svg" 
          className="hidden" 
          onChange={handleFileChange} 
        />
      </label>
    </div>
  );
};

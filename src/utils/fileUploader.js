import { BASE_URI } from "../data/constants";
import axios from 'axios';

export default async function uploadFile(fileUri, fileName, fileType, options) {
    const formData = new FormData();

    formData.append("file", {
        uri: fileUri,
        name: fileName,
        type: fileType
    });

    formData.append("is_private", 1);

    if (options?.isPrivate) {
        formData.append('is_private', '1');
    }

    if (options?.folder) {
        formData.append('folder', options.folder);
    } else {
        formData.append("folder", "Home");
    }

    if (options?.file_url) {
        formData.append('file_url', options.file_url);
    }
    if (options?.doctype && options?.docname) {
        formData.append('doctype', options.doctype);
        formData.append('docname', options.docname);
        if (options?.fieldname) {
            formData.append('fieldname', options.fieldname);
        }
    }

    // Add timeout and validate URL
    const url = `${BASE_URI}/api/method/upload_file`;
    console.log('Attempting upload to:', url);
    console.log('Upload parameters:', {
        fileUri,
        fileName,
        fileType,
        isPrivate: options?.isPrivate,
        doctype: options?.doctype,
        docname: options?.docname,
        fieldname: options?.fieldname
    });
    
    try {
        // First check if we can reach the server
        try {
            await axios.get(BASE_URI, { timeout: 5000 });
        } catch (pingError) {
            console.error('Cannot reach server:', pingError.message);
            throw new Error('Cannot connect to server. Please check your internet connection.');
        }

        // Proceed with upload if server is reachable
        const response = await axios.post(url, formData, {
            headers: {
                Authorization: `Bearer ${options?.accessToken}`,
                "Content-Type": "multipart/form-data",
                "Accept": "application/json"
            },
            timeout: 60000, // Increase timeout to 60 seconds for large files
            transformRequest: (data) => {
                return data;
            },
            onUploadProgress: (progressEvent) => {
                if (options?.onUploadProgress) {
                    options.onUploadProgress(progressEvent);
                }
            }
        });

        console.log('Upload response:', response.data);

        if (options?.onUploadComplete) {
            options.onUploadComplete(response.data);
        }
        return response.data;
        
    } catch (error) {
        console.error("Upload Error Details:", {
            message: error.message,
            code: error.code,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers
            },
            response: error.response?.data || 'No response data'
        });

        // Check for specific error types
        if (error.code === 'ECONNABORTED') {
            throw new Error('Upload timed out. The file might be too large or your connection is slow.');
        }
        
        if (!error.response) {
            throw new Error('Network error. Please check your internet connection and try again.');
        }

        if (error.response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
        }

        if (error.response.status === 413) {
            throw new Error('File is too large. Please choose a smaller file.');
        }

        throw {
            httpStatus: error?.response?.status,
            httpStatusText: error?.response?.statusText,
            message: error?.response?.data?.message || 'There was an error while uploading the file.',
            exception: error?.response?.data?.exception || '',
        };
    }
}
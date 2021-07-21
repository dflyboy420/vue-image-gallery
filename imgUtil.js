

const result = await new Promise((resolve, reject) => {
    child_process.exec(
       `face_detection ${file.path}`,
       (error: child.ExecException, stdout: string, stderr: string) => {
         if (error) {
           reject(error);
         } else {
           resolve(stdout); 
         }
       });
 });
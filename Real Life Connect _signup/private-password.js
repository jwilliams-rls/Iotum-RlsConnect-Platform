const { emitKeypressEvents } = require('node:readline');
function readPrivatePassword(label) {
  const input=process.stdin, output=process.stdout;
  if(!input.isTTY || !output.isTTY)throw new Error('Run this command directly in an interactive terminal. Passwords are not accepted as arguments or piped input.');
  return new Promise((resolve,reject)=>{
    let value='';const wasRaw=input.isRaw;
    emitKeypressEvents(input);input.setRawMode(true);input.resume();output.write(label);
    function finish(error){input.off('keypress',onKey);input.setRawMode(Boolean(wasRaw));input.pause();output.write('\n');if(error)reject(error);else resolve(value);}
    function onKey(text,key={}){
      if(key.ctrl && key.name==='c')return finish(new Error('Password entry cancelled. No account was linked.'));
      if(key.name==='return' || key.name==='enter')return finish();
      if(key.name==='backspace'){value=Array.from(value).slice(0,-1).join('');return;}
      if(!key.ctrl && !key.meta && typeof text==='string' && !/[\u0000-\u001f\u007f-\u009f]/.test(text) && value.length+text.length<=256)value+=text;
    }
    input.on('keypress',onKey);
  });
}
async function chooseWebsitePassword(){
  const password=await readPrivatePassword('New WEBSITE password (12–256 characters; typing is hidden): ');
  if(password.length<12 || password.length>256)throw new Error('Use 12–256 characters. No account was linked.');
  const confirm=await readPrivatePassword('Confirm WEBSITE password (typing is hidden): ');
  if(password!==confirm)throw new Error('Passwords did not match. No account was linked.');
  return password;
}
module.exports={readPrivatePassword,chooseWebsitePassword};

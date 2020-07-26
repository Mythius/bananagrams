const EI = require('electron-winstaller');

try{
	EI.createWindowsInstaller({
		appDirectory: './bananagrams-win32-x64',
		outputDirectory: 'bananagrams-installer',
		authors: 'Matthias Southwick',
		exe: 'bananagrams.exe'
	}).then(e=>{
		console.log('Success');
	}).catch(e=>{
		console.error(e.message);
	})
} catch(e) {
	console.error(e.message);
}
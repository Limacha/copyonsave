import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface CopyRule {
	source: string; // nom du fichier à surveiller (ex: "script.js")
	destination: string; // chemin relatif de destination (ex: "copie/script_copy.js")
	injection: string; // texte à injecter
	position: 'start' | 'end'; // position de l'injection
}

export function activate(context: vscode.ExtensionContext) {
	// Commande pour créer le fichier JSON exemple
	const createJsonCmd = vscode.commands.registerCommand('copyonsaveandedit.createjson', async () => {
		const wsFolders = vscode.workspace.workspaceFolders;
		if (!wsFolders) {
			vscode.window.showErrorMessage("Aucun dossier ouvert.");
			return;
		}
		const root = wsFolders[0].uri.fsPath;
		const configPath = path.join(root, 'copyonsaveandedit.json');

		if (fs.existsSync(configPath)) {
			const answer = await vscode.window.showWarningMessage(
				"Le fichier existe déjà. Écraser ?",
				"Oui", "Non"
			);
			if (answer !== "Oui") return;
		}

		const example: CopyRule[] = [
			{
				source: "test/test.txt",
				destination: "copies/test_copy.txt",
				injection: "// Ajout exemple",
				position: "end"
			},
			{
				source: "test/test2.txt",
				destination: "copies/test2_copy.txt",
				injection: "// Ajout exemple",
				position: "start"
			}
		];
		try {
			fs.writeFileSync(configPath, JSON.stringify(example, null, 2), 'utf-8');
			vscode.window.showInformationMessage("Fichier copyonsaveandedit.json créé.");
			const doc = await vscode.workspace.openTextDocument(configPath);
			vscode.window.showTextDocument(doc);
		} catch (e: any) {
			vscode.window.showErrorMessage("Erreur écriture du fichier : " + e.message);
		}
	});
	context.subscriptions.push(createJsonCmd);

	vscode.workspace.onDidSaveTextDocument(document => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) return;

		const rootPath = workspaceFolders[0].uri.fsPath;
		const configPath = path.join(rootPath, 'copyonsaveandedit.json');

		if (!fs.existsSync(configPath)) {
			console.log('Fichier de config "copyonsaveandedit" non trouvé.');
			return;
		}

		let rules: CopyRule[];
		try {
			const configContent = fs.readFileSync(configPath, 'utf-8');
			rules = JSON.parse(configContent);
		} catch (err) {
			vscode.window.showErrorMessage('Erreur en lisant le fichier de config : ' + err);
			return;
		}

		const fileName = path.relative(rootPath, document.uri.fsPath).replace(/\\/g, '/');

		const matchingRules = rules.filter(rule => rule.source === fileName);

		if (matchingRules.length === 0) return;

		const originalContent = document.getText();

		matchingRules.forEach(rule => {
			const newContent =
				rule.position === 'start'
					? rule.injection + '\n' + originalContent
					: originalContent + '\n' + rule.injection;

			const destPath = path.join(rootPath, rule.destination);
			const destDir = path.dirname(destPath);

			// Crée le dossier s'il n'existe pas
			try {
				fs.mkdirSync(destDir, { recursive: true });
			} catch (mkdirErr) {
				vscode.window.showErrorMessage(`Erreur création du dossier ${destDir} : ${mkdirErr}`);
				return;
			}

			fs.writeFile(destPath, newContent, err => {
				if (err) {
					vscode.window.showErrorMessage(`Erreur écriture ${rule.destination} : ${err.message}`);
				} else {
					vscode.window.showInformationMessage(`Copié ${rule.source} → ${rule.destination}`);
				}
			});
		});
	});
}

export function deactivate() { }

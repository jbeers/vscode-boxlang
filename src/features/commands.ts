import { commands, TextDocument, TextEditor, Uri, window, workspace, WorkspaceConfiguration } from "vscode";
import { Component, getApplicationUri } from "../entities/component";
import { UserFunction } from "../entities/userFunction";
import CFDocsService from "../utils/cfdocs/cfDocsService";
import { isCfcFile } from "../utils/contextUtil";
import SnippetService from "../utils/snippetService";
import * as cachedEntity from "./cachedEntities";

/**
 * Refreshes (clears and retrieves) all CFML global definitions
 */
export async function refreshGlobalDefinitionCache(): Promise<void> {
    cachedEntity.clearAllGlobalFunctions();
    cachedEntity.clearAllGlobalTags();
    cachedEntity.clearAllGlobalEntityDefinitions();
    cachedEntity.clearAllCustomSnippets();

    const cfmlGlobalDefinitionsSettings: WorkspaceConfiguration = workspace.getConfiguration("boxlang.cfml.globalDefinitions");
    if (cfmlGlobalDefinitionsSettings.get<string>("source") === "cfdocs") {
        CFDocsService.cacheAll();
    }

    SnippetService.cacheAllCustomSnippets();
}

/**
 * Refreshes (clears and retrieves) all CFML workspace definitions
 */
export async function refreshWorkspaceDefinitionCache(): Promise<void> {
    const cfmlIndexComponentsSettings: WorkspaceConfiguration = workspace.getConfiguration("boxlang.cfml.indexComponents");
    if (cfmlIndexComponentsSettings.get<boolean>("enable")) {
        cachedEntity.cacheAllComponents();
    }
}

/**
 * Opens the relevant Application file based on the given editor
 * @editor The text editor which represents the document for which to open the file
 */
export async function showApplicationDocument(editor: TextEditor): Promise<void> {
    const activeDocumentUri: Uri = editor.document.uri;

    if (activeDocumentUri.scheme === "untitled") {
        return;
    }

    const applicationUri: Uri = getApplicationUri(activeDocumentUri);
    if (applicationUri) {
        const applicationDocument: TextDocument = await workspace.openTextDocument(applicationUri);
        if (!applicationDocument) {
            window.showErrorMessage("No Application found for the currently active document.");
            return;
        }

        window.showTextDocument(applicationDocument);
    }
}

/**
 * Folds all functions in the active editor. Currently only works for components.
 * @editor The text editor which represents the document for which to fold all function
 */
export async function foldAllFunctions(editor: TextEditor): Promise<void> {
    const document: TextDocument = editor.document;

    if (isCfcFile(document)) {
        const thisComponent: Component = cachedEntity.getComponent(document.uri);
        if (thisComponent) {
            const functionStartLines: number[] = [];
            thisComponent.functions.filter((func: UserFunction) => {
                return !func.isImplicit && func.bodyRange !== undefined;
            }).forEach((func: UserFunction) => {
                functionStartLines.push(func.bodyRange.start.line);
            });

            if (functionStartLines.length > 0) {
                commands.executeCommand("editor.fold", { selectionLines: functionStartLines });
            }
        }
    }
}

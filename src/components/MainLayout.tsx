import React, { useRef } from 'react';
import { File, FileText, FolderOpen, RefreshCw, ClipboardCopy, Eye, EyeOff } from 'lucide-react';
import { useLogStore, LogEntry } from '../stores/logStore';
import FileExplorer from './fileExplorer/FileExplorer';
import ActionPanel from './ActionPanel';
import FileViewerPanel from './FileViewerPanel';
import ApplyChangesPanel from './ApplyChangesPanel';
import AthanorTabs, { TabType } from './AthanorTabs';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { FileItem } from '../utils/fileTree';
import { usePanelResize } from '../hooks/usePanelResize';
import { copySelectedFilesContent } from '../actions/ManualCopyAction';

interface MainLayoutProps {
  filesData: FileItem;
  materialsData: FileItem | null;
  currentDirectory: string;
  appVersion: string;
  isRefreshing: boolean;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenFolder: () => Promise<void>;
  onRefresh: () => Promise<void>;
  logsRef: React.RefObject<HTMLDivElement | null>;
  logs: LogEntry[];
}

const MainLayout: React.FC<MainLayoutProps> = ({
  filesData,
  materialsData,
  currentDirectory,
  appVersion,
  isRefreshing,
  activeTab,
  onTabChange,
  onOpenFolder,
  onRefresh,
  logsRef,
  logs,
}) => {
  const { leftPanelWidth, isResizing, resizeRef, startResize } =
    usePanelResize();
  const { selectedFileCount, selectedLinesTotal, smartPreviewEnabled, toggleSmartPreview } = useFileSystemStore();

  const handleFileView = () => {
    onTabChange('viewer');
  };

  const { addLog } = useLogStore();
  const handleCopySelectedFiles = async () => {
    await copySelectedFilesContent({
      addLog,
      rootPath: currentDirectory,
    });
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Left Panel - File Explorer */}
      <div
        style={{ width: leftPanelWidth }}
        className="flex-shrink-0 flex flex-col border-r h-full"
      >
        {/* Fixed top section */}
        <div className="p-4 flex-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenFolder}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Open folder"
              >
                <FolderOpen size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => onRefresh()}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isRefreshing}
                title="Refresh file system"
              >
                <RefreshCw
                  size={20}
                  className={`${
                    isRefreshing
                      ? 'animate-spin text-gray-400'
                      : 'text-gray-600'
                  }`}
                />
              </button>
              <button
                onClick={handleCopySelectedFiles}
                disabled={selectedFileCount === 0}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Copy selected files"
              >
                <ClipboardCopy
                  size={20}
                  className={`${
                    selectedFileCount === 0
                      ? 'text-gray-400'
                      : 'text-gray-600'
                  }`}
                />
              </button>
              <button
                onClick={toggleSmartPreview}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title={smartPreviewEnabled ? "Smart Preview: ON (click to disable)" : "Smart Preview: OFF (click to enable)"}
              >
                {smartPreviewEnabled ? (
                  <Eye size={20} className="text-blue-600" />
                ) : (
                  <EyeOff size={20} className="text-gray-600" />
                )}
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-0">{currentDirectory}</div>
        </div>

        {/* Scrollable file explorer section */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <FileExplorer
            items={[filesData, ...(materialsData ? [materialsData] : [])]}
            onViewFile={handleFileView}
            onRefresh={onRefresh}
          />
        </div>

        {/* Fixed bottom section */}
        <div className="border-t p-2 bg-gray-50 text-sm text-gray-600 flex items-center justify-between flex-none">
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-1"
              title="Number of selected files"
            >
              <File size={14} />
              <span>{selectedFileCount}</span>
            </div>
            <div
              className="flex items-center gap-1"
              title="Total lines across selected files"
            >
              <FileText size={14} />
              <span>{selectedLinesTotal}</span>
            </div>
          </div>
          <div className="text-gray-500" title="Athanor application version">
            {appVersion}
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-500 active:bg-blue-700"
        onMouseDown={startResize}
      />

      {/* Right Panel */}
      <div className="flex-1 flex flex-col">
        {/* Top panel: tabs */}
        <AthanorTabs activeTab={activeTab} onTabChange={onTabChange} />

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'workbench' && (
            <ActionPanel
              rootItems={[filesData]}
              setActivePanelTab={onTabChange}
              isActive={activeTab === 'workbench'}
            />
          )}
          {activeTab === 'viewer' && <FileViewerPanel />}
          {activeTab === 'apply-changes' && <ApplyChangesPanel />}
        </div>

        {/* Bottom panel: logs */}
        <div
          ref={logsRef}
          className="h-24 border-t p-2 bg-gray-50 overflow-y-auto font-mono text-sm"
        >
          {logs.map((log) => (
            <div key={log.id} className="text-gray-700">
              {log.onClick ? (
                <button
                  onClick={log.onClick}
                  className="text-left text-purple-600 hover:underline active:bg-purple-100 transition-colors"
                >
                  [{log.timestamp}] {log.message}
                </button>
              ) : (
                <span>[{log.timestamp}] {log.message}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;

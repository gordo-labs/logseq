import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { GraphProvider, useGraph, DEFAULT_CAPTURE_PAGE } from './context/GraphContext';
import { BlockNode, PageSnapshot, createBlock, flattenTree, insertBlock, updateBlockText } from './lib/page';

const PRIMARY = '#3b82f6';
const BACKGROUND = '#0f172a';
const SURFACE = '#111827';
const SURFACE_ELEVATED = '#1f2937';
const TEXT_PRIMARY = '#f9fafb';
const TEXT_SECONDARY = '#cbd5f5';
const BORDER = '#1e293b';

export const App: React.FC = () => (
  <GraphProvider>
    <AppContent />
  </GraphProvider>
);

const AppContent: React.FC = () => {
  const { pages, loading, error, quickCapture, version } = useGraph();
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [captureText, setCaptureText] = useState('');
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPage) return;
    const today = pages.find(page => page.title === DEFAULT_CAPTURE_PAGE);
    if (today) {
      setSelectedPage(today.title);
    }
  }, [pages, selectedPage]);

  const handleQuickCapture = useCallback(async () => {
    const trimmed = captureText.trim();
    if (!trimmed) {
      setCaptureError('Enter some text to capture.');
      return;
    }
    setCaptureError(null);
    const result = await quickCapture(trimmed);
    if (result.ok) {
      setCaptureText('');
      setCaptureStatus(`Captured to ${result.value.pageTitle}.`);
    } else {
      setCaptureStatus(null);
      setCaptureError(result.error);
    }
  }, [captureText, quickCapture]);

  useEffect(() => {
    if (!captureStatus) return;
    const timer = setTimeout(() => setCaptureStatus(null), 2500);
    return () => clearTimeout(timer);
  }, [captureStatus]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {selectedPage ? (
          <TouchableOpacity onPress={() => setSelectedPage(null)} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.title}>Pages</Text>
        )}
        <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={PRIMARY} style={styles.loadingIndicator} /> : null}
      <View style={styles.content}>
        {selectedPage ? (
          <PageScreen title={selectedPage} />
        ) : (
          <PageList pages={pages} onSelectPage={setSelectedPage} refreshing={loading} />
        )}
      </View>
      <QuickCaptureBar
        value={captureText}
        onChangeText={setCaptureText}
        onSubmit={handleQuickCapture}
        status={captureStatus}
        error={captureError}
      />
      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelectPage={title => {
          setSelectedPage(title);
          setSearchVisible(false);
        }}
        version={version}
      />
    </SafeAreaView>
  );
};

interface PageListProps {
  pages: { title: string }[];
  onSelectPage: (title: string) => void;
  refreshing: boolean;
}

const PageList: React.FC<PageListProps> = ({ pages, onSelectPage, refreshing }) => {
  return (
    <FlatList
      data={pages}
      keyExtractor={item => item.title}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onSelectPage(item.title)} style={styles.pageRow}>
          <Text style={styles.pageTitle}>{item.title}</Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={pages.length ? undefined : styles.emptyStateContainer}
      ListEmptyComponent={
        !refreshing ? <Text style={styles.emptyStateText}>No pages yet. Capture something to get started.</Text> : null
      }
    />
  );
};

interface PageScreenProps {
  title: string;
}

const PageScreen: React.FC<PageScreenProps> = ({ title }) => {
  const { getPageSnapshot, persistPage, ensurePage, core, version } = useGraph();
  const [snapshot, setSnapshot] = useState<PageSnapshot>(() => getPageSnapshot(title));
  const [draft, setDraft] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setSnapshot(getPageSnapshot(title));
  }, [getPageSnapshot, title, version]);

  const handleChangeBlock = useCallback((blockId: string, text: string) => {
    setSnapshot(prev => {
      if (!prev.page) return prev;
      const updatedNodes = updateBlockText(prev.nodes, blockId, text);
      void persistPage(prev.page.title, updatedNodes, prev.page.path ?? null).then(result => {
        if (!result.ok) {
          setSaveError(result.error);
        } else {
          setSaveError(null);
        }
      });
      return { page: prev.page, nodes: updatedNodes };
    });
  }, [persistPage]);

  const handleAddBlock = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');
    setSnapshot(prev => {
      if (!prev.page) return prev;
      const newBlock = createBlock(prev.page.title, trimmed, null);
      const updatedNodes = insertBlock(prev.nodes, null, prev.nodes.length, newBlock);
      void persistPage(prev.page.title, updatedNodes, prev.page.path ?? null).then(result => {
        if (!result.ok) {
          setSaveError(result.error);
        } else {
          setSaveError(null);
        }
      });
      return { page: prev.page, nodes: updatedNodes };
    });
  }, [draft, persistPage]);

  const handleCreatePage = useCallback(async () => {
    setCreating(true);
    const result = await ensurePage(title);
    setCreating(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSnapshot({ page: result.value, nodes: [] });
    setSaveError(null);
  }, [ensurePage, title]);

  const flattened = useMemo(() => flattenTree(snapshot.nodes), [snapshot.nodes]);

  const backlinks = useMemo(() => {
    if (!core) return [] as Array<{ source: string; text: string }>;
    const links = core.listLinksToPage(title);
    if (!links.ok) return [];
    return links.value.map(link => {
      const blockText = link.sourceBlockId ? (() => {
        const block = core.getBlock(link.sourceBlockId);
        return block.ok ? block.value.text : '';
      })() : '';
      return { source: link.sourcePage, text: blockText };
    });
  }, [core, title, version]);

  if (!snapshot.page) {
    return (
      <View style={styles.emptyPageContainer}>
        <Text style={styles.emptyStateText}>This page has not been created yet.</Text>
        <TouchableOpacity onPress={handleCreatePage} style={styles.primaryButton} disabled={creating}>
          <Text style={styles.primaryButtonText}>{creating ? 'Creating…' : 'Create Page'}</Text>
        </TouchableOpacity>
        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.pageContainer}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {flattened.map(item => (
          <BlockEditor key={item.node.block.id} node={item.node} depth={item.depth} onChange={handleChangeBlock} />
        ))}
        <View style={styles.addBlockBar}>
          <TextInput
            style={styles.addBlockInput}
            placeholder="Add a block"
            placeholderTextColor={TEXT_SECONDARY}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleAddBlock}>
            <Text style={styles.primaryButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
        <View style={styles.backlinkSection}>
          <Text style={styles.sectionTitle}>Backlinks</Text>
          {backlinks.length === 0 ? (
            <Text style={styles.emptyStateText}>No backlinks yet.</Text>
          ) : (
            backlinks.map((item, index) => (
              <View key={`${item.source}-${index}`} style={styles.backlinkRow}>
                <Text style={styles.backlinkSource}>{item.source}</Text>
                {item.text ? <Text style={styles.backlinkSnippet}>{item.text}</Text> : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

interface BlockEditorProps {
  node: BlockNode;
  depth: number;
  onChange: (blockId: string, text: string) => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ node, depth, onChange }) => {
  const [value, setValue] = useState(node.block.text);

  useEffect(() => {
    setValue(node.block.text);
  }, [node.block.text]);

  return (
    <View style={[styles.blockContainer, { paddingLeft: depth * 16 + 12 }]}> 
      <TextInput
        style={styles.blockInput}
        multiline
        value={value}
        onChangeText={text => {
          setValue(text);
          onChange(node.block.id, text);
        }}
        placeholder="Write something"
        placeholderTextColor={TEXT_SECONDARY}
      />
    </View>
  );
};

interface QuickCaptureBarProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  status: string | null;
  error: string | null;
}

const QuickCaptureBar: React.FC<QuickCaptureBarProps> = ({ value, onChangeText, onSubmit, status, error }) => (
  <View style={styles.captureContainer}>
    <TextInput
      style={styles.captureInput}
      placeholder={`Quick capture to ${DEFAULT_CAPTURE_PAGE}`}
      placeholderTextColor={TEXT_SECONDARY}
      value={value}
      onChangeText={onChangeText}
      multiline
    />
    <TouchableOpacity style={styles.primaryButton} onPress={onSubmit}>
      <Text style={styles.primaryButtonText}>Capture</Text>
    </TouchableOpacity>
    {status ? <Text style={styles.statusText}>{status}</Text> : null}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPage: (title: string) => void;
  version: number;
}

const SearchModal: React.FC<SearchModalProps> = ({ visible, onClose, onSelectPage, version }) => {
  const { search } = useGraph();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ pages: { title: string }[]; blocks: { id: string; pageId: string; text: string }[] }>(
    { pages: [], blocks: [] }
  );

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults({ pages: [], blocks: [] });
      setError(null);
      return;
    }
    const outcome = search(query);
    if (outcome.ok) {
      setResults(outcome.value);
      setError(null);
    } else {
      setError(outcome.error);
    }
  }, [query, search, visible, version]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TextInput
            style={styles.modalInput}
            placeholder="Search pages and blocks"
            placeholderTextColor={TEXT_SECONDARY}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <ScrollView contentContainerStyle={styles.modalResults}>
          <Text style={styles.sectionTitle}>Pages</Text>
          {results.pages.length === 0 ? (
            <Text style={styles.emptyStateText}>No pages found.</Text>
          ) : (
            results.pages.map(page => (
              <Pressable
                key={page.title}
                style={styles.searchResultRow}
                onPress={() => {
                  onSelectPage(page.title);
                  onClose();
                }}
              >
                <Text style={styles.pageTitle}>{page.title}</Text>
              </Pressable>
            ))
          )}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Blocks</Text>
          {results.blocks.length === 0 ? (
            <Text style={styles.emptyStateText}>No blocks found.</Text>
          ) : (
            results.blocks.map(block => (
              <Pressable
                key={block.id}
                style={styles.searchResultRow}
                onPress={() => {
                  onSelectPage(block.pageId);
                  onClose();
                }}
              >
                <Text style={styles.pageTitle}>{block.pageId}</Text>
                <Text style={styles.blockSnippet}>{block.text}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  title: {
    fontSize: 20,
    color: TEXT_PRIMARY,
    fontWeight: '600'
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: SURFACE_ELEVATED
  },
  backButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 16
  },
  searchButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: PRIMARY
  },
  searchButtonText: {
    color: '#0b1120',
    fontWeight: '600'
  },
  errorText: {
    color: '#fca5a5',
    paddingHorizontal: 16,
    paddingBottom: 8
  },
  loadingIndicator: {
    marginVertical: 8
  },
  content: {
    flex: 1
  },
  pageRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  pageTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16
  },
  emptyStateContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyStateText: {
    color: TEXT_SECONDARY,
    textAlign: 'center'
  },
  pageContainer: {
    flex: 1
  },
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 24
  },
  blockContainer: {
    paddingVertical: 8
  },
  blockInput: {
    backgroundColor: SURFACE,
    color: TEXT_PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
    textAlignVertical: 'top'
  },
  addBlockBar: {
    marginTop: 16,
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: 12,
    padding: 12
  },
  addBlockInput: {
    backgroundColor: SURFACE,
    color: TEXT_PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    minHeight: 48,
    marginBottom: 12
  },
  backlinkSection: {
    marginTop: 24,
    paddingHorizontal: 16
  },
  sectionTitle: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16
  },
  sectionSpacing: {
    marginTop: 24
  },
  backlinkRow: {
    paddingVertical: 8,
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  backlinkSource: {
    color: TEXT_PRIMARY,
    fontWeight: '500'
  },
  backlinkSnippet: {
    color: TEXT_SECONDARY,
    marginTop: 4
  },
  captureContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopColor: BORDER,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: SURFACE_ELEVATED
  },
  captureInput: {
    backgroundColor: SURFACE,
    color: TEXT_PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    minHeight: 48,
    marginBottom: 10
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start'
  },
  primaryButtonText: {
    color: '#0b1120',
    fontWeight: '600'
  },
  statusText: {
    color: '#86efac',
    marginTop: 8
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BACKGROUND
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  modalInput: {
    flex: 1,
    backgroundColor: SURFACE,
    color: TEXT_PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 12
  },
  modalCloseButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: SURFACE_ELEVATED
  },
  modalCloseText: {
    color: TEXT_PRIMARY,
    fontWeight: '500'
  },
  modalResults: {
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  searchResultRow: {
    paddingVertical: 12,
    borderBottomColor: BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  blockSnippet: {
    color: TEXT_SECONDARY,
    marginTop: 4
  },
  emptyPageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  }
});

export default App;

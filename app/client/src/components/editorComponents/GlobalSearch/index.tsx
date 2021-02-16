import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { useParams } from "react-router";
import history from "utils/history";
import { AppState } from "reducers";
import SearchModal from "./SearchModal";
import AlgoliaSearchWrapper from "./AlgoliaSearchWrapper";
import SearchBox from "./SearchBox";
import SearchResults from "./SearchResults";
import SetSearchResults from "./SetSearchResults";
import GlobalSearchHotKeys from "./GlobalSearchHotKeys";
import SearchContext from "./GlobalSearchContext";
import Description from "./Description";
import { getActions, getAllPageWidgets } from "selectors/entitiesSelector";
import { useNavigateToWidget } from "pages/Editor/Explorer/Widgets/WidgetEntity";
import { toggleShowGlobalSearchModal } from "actions/globalSearchActions";
import { getItemType, SEARCH_ITEM_TYPES } from "./utils";
import { getActionConfig } from "pages/Editor/Explorer/Actions/helpers";
import { HelpBaseURL } from "constants/HelpConstants";
import { ExplorerURLParams } from "pages/Editor/Explorer/helpers";
import { useFilteredDatasources } from "pages/Editor/Explorer/hooks";
import { DATA_SOURCES_EDITOR_ID_URL } from "constants/routes";

const StyledContainer = styled.div`
  width: 660px;
  height: 40vh;
  background: ${(props) => props.theme.colors.globalSearch.containerBackground};
  box-shadow: ${(props) => props.theme.colors.globalSearch.containerShadow};
  display: flex;
  flex-direction: column;
  & .main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
`;

const Separator = styled.div`
  margin: ${(props) => props.theme.spaces[3]}px 0;
  width: 1px;
  background-color: ${(props) => props.theme.colors.globalSearch.separator};
`;

const isModalOpenSelector = (state: AppState) =>
  state.ui.globalSearch.modalOpen;
const GlobalSearch = () => {
  const params = useParams<ExplorerURLParams>();
  const dispatch = useDispatch();
  const toggleShow = () => dispatch(toggleShowGlobalSearchModal());
  const [query, setQuery] = useState("");
  const [documentationSearchResults, setDocumentationSearchResults] = useState<
    Array<any>
  >([]);

  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const allWidgets = useSelector(getAllPageWidgets);
  const searchableWidgets = useMemo(
    () =>
      allWidgets.filter(
        (widget: any) =>
          ["MAIN_CONTAINER", "ICON_WIDGET"].indexOf(widget.type) === -1,
      ),
    [allWidgets],
  );
  const actions = useSelector(getActions);
  const datasourcesMap = useFilteredDatasources(query);
  const modalOpen = useSelector(isModalOpenSelector);

  const datasourcesList = useMemo(() => {
    return Object.entries(datasourcesMap).reduce((res: any[], curr) => {
      const [key, value] = curr;
      return [...res, ...value];
    }, []);
  }, [datasourcesMap]);

  const filteredWidgets = useMemo(() => {
    if (!query) return searchableWidgets;

    return searchableWidgets.filter(
      (widget: any) =>
        widget.widgetName.toLowerCase().indexOf(query.toLocaleLowerCase()) > -1,
    );
  }, [allWidgets, query]);
  const filteredActions = useMemo(() => {
    if (!query) return actions;

    return actions.filter(
      (action: any) =>
        action.config.name.toLowerCase().indexOf(query.toLocaleLowerCase()) >
        -1,
    );
  }, [actions, query]);

  const searchResults = useMemo(() => {
    return [
      ...filteredWidgets,
      ...filteredActions,
      ...datasourcesList,
      ...documentationSearchResults,
    ];
  }, [
    filteredWidgets,
    filteredActions,
    documentationSearchResults,
    datasourcesList,
  ]);

  const activeItem = useMemo(() => {
    return searchResults[activeItemIndex] || {};
  }, [searchResults, activeItemIndex]);

  const getNextActiveItem = (nextIndex: number) => {
    const max = Math.max(searchResults.length - 1, 0);
    if (nextIndex < 0) return 0;
    else if (nextIndex > max) return max;
    else return nextIndex;
  };

  const handleUpKey = () =>
    setActiveItemIndex(getNextActiveItem(activeItemIndex - 1));

  const handleDownKey = () =>
    setActiveItemIndex(getNextActiveItem(activeItemIndex + 1));

  const { navigateToWidget } = useNavigateToWidget();

  const handleDocumentationItemClick = (item: any) => {
    window.open(item.path.replace("master", HelpBaseURL), "_blank");
  };

  const handleWidgetClick = (activeItem: any) => {
    toggleShow();
    navigateToWidget(
      activeItem.widgetId,
      activeItem.type,
      activeItem.pageId,
      false,
      activeItem.parentModalId,
    );
  };

  const handleActionClick = (item: any) => {
    const { config } = item;
    const { pageId, pluginType, id } = config;
    const actionConfig = getActionConfig(pluginType);
    const url = actionConfig?.getURL(params.applicationId, pageId, id);
    toggleShow();
    url && history.push(url);
  };

  const handleDatasourceClick = (item: any) => {
    toggleShow();
    history.push(
      DATA_SOURCES_EDITOR_ID_URL(params.applicationId, params.pageId, item.id),
    );
  };

  const itemClickHandlerByType = {
    [SEARCH_ITEM_TYPES.documentation]: handleDocumentationItemClick,
    [SEARCH_ITEM_TYPES.widget]: handleWidgetClick,
    [SEARCH_ITEM_TYPES.action]: handleActionClick,
    [SEARCH_ITEM_TYPES.datasource]: handleDatasourceClick,
  };

  const handleItemLinkClick = (item?: any) => {
    const _item = item || activeItem;
    const type = getItemType(_item) as SEARCH_ITEM_TYPES;
    itemClickHandlerByType[type](_item);
  };

  const searchContext = {
    handleItemLinkClick,
    setActiveItemIndex,
    activeItemIndex,
  };

  const hotKeyProps = {
    modalOpen,
    toggleShow,
    handleUpKey,
    handleDownKey,
    handleItemLinkClick,
  };

  const activeItemType = useMemo(() => {
    return activeItem ? getItemType(activeItem) : undefined;
  }, [activeItem]);

  return (
    <SearchContext.Provider value={searchContext}>
      <GlobalSearchHotKeys {...hotKeyProps}>
        <SearchModal toggleShow={toggleShow} modalOpen={modalOpen}>
          <AlgoliaSearchWrapper query={query}>
            <StyledContainer>
              <SearchBox query={query} setQuery={setQuery} />
              <div className="main">
                <SetSearchResults
                  setDocumentationSearchResults={setDocumentationSearchResults}
                />
                <SearchResults searchResults={searchResults} query={query} />
                <Separator />
                <Description
                  activeItem={activeItem}
                  activeItemType={activeItemType}
                />
              </div>
            </StyledContainer>
          </AlgoliaSearchWrapper>
        </SearchModal>
      </GlobalSearchHotKeys>
    </SearchContext.Provider>
  );
};

export default GlobalSearch;

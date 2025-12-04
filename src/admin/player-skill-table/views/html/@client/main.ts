import {
  createGrid,
    ModuleRegistry,
    NumberEditorModule,
    AlignedGridsModule,
  ClientSideRowModelModule,
    themeQuartz,
} from 'ag-grid-community';

ModuleRegistry.registerModules([
    NumberEditorModule,
    AlignedGridsModule,
    ClientSideRowModelModule,
]);

export function makePlayerSkillTable(element: HTMLElement, columns: { field: string, sortable: boolean }[], data: unknown[]) {
  createGrid(element, {
    columnDefs: columns,
    rowData: data,
    theme: themeQuartz.withParams({
      backgroundColor: '#141115',
      foregroundColor: '#C7C4C7',
    }),
    onCellValueChanged: function(event) {
        console.log('Cell changed', event.colDef.field, 'new value:', event.newValue);
        // send event.data to backend to persist changes
      }
  });
}

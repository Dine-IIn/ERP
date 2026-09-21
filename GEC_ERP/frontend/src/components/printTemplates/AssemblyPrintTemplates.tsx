import React from 'react';
import { FloorStation, MachineAssembly } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';
import { CompanyPrintFooter } from './CompanyPrintFooter';
import { PrintDocumentLayout } from './StandardCompanyHeaderFooter';

// 1. Assembly Floor Stage Status Report
export const AssemblyFloorPrintView: React.FC<{ stations: FloorStation[]; assemblies?: MachineAssembly[]; filterLabel?: string }> = ({
  stations,
  assemblies = [],
  filterLabel = 'Active Assembly Floor Stations'
}) => (
  <PrintDocumentLayout
    header={<GECPrintHeader docTitle="ASSEMBLY FLOOR & WORKSTATION TRACKING REPORT" />}
    footer={<CompanyPrintFooter />}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({stations.length} stations)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Station Code</th>
          <th>Workstation Name</th>
          <th>Stage Tag</th>
          <th style={{ width: '80px', textAlign: 'center' }}>Capacity</th>
          <th>Station Supervisor</th>
          <th>Active WOs</th>
        </tr>
      </thead>
      <tbody>
        {stations.map((stn, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{stn.code}</td>
            <td style={{ fontWeight: 600 }}>{stn.name}</td>
            <td>{stn.stageTag}</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{stn.capacity} Units</td>
            <td>{stn.supervisorName || '-'}</td>
            <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
              {(stn.assignedWOIds || []).length > 0 ? stn.assignedWOIds.join(', ') : 'None (Available)'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="Shop Floor Incharge" checkedBy="Production Lead" authorizedBy="Works Director" />
  </PrintDocumentLayout>
);

// 2. Sub-Assembly Units Floor Status Report
export const AssemblyListPrintView: React.FC<{ assemblies: any[]; filterLabel?: string }> = ({
  assemblies,
  filterLabel = 'Active Assembly Units'
}) => (
  <PrintDocumentLayout
    header={<GECPrintHeader docTitle="MACHINE SUB-ASSEMBLY STATIONS PROGRESS REPORT" />}
    footer={<CompanyPrintFooter />}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({assemblies.length} units)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Assembly Code</th>
          <th>Assembly Name</th>
          <th>WO Ref</th>
          <th>Station</th>
          <th>Lead Tech</th>
          <th>Progress</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {assemblies.map((asm, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{asm.assemblyCode || asm.code || asm.id}</td>
            <td style={{ fontWeight: 600 }}>{asm.assemblyName || asm.name || asm.machineModel}</td>
            <td style={{ fontFamily: 'monospace' }}>{asm.workOrderNo || asm.woNumber || '-'}</td>
            <td>{asm.stationName || asm.subAssemblyType || '-'}</td>
            <td>{asm.leadTechnician || '-'}</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{asm.progressPercentage ?? asm.progress ?? 0}%</td>
            <td style={{ fontWeight: 700 }}>{asm.status || 'IN_PROGRESS'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="Floor Lead" checkedBy="Plant Head" authorizedBy="Managing Director" />
  </PrintDocumentLayout>
);

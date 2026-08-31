import React from 'react';
import { FloorStation, MachineAssembly } from '../../types/erp';
import { GECPrintHeader, GECPrintSignatory } from './WOPrintTemplates';

// 1. Assembly Floor Stage Status Report
export const AssemblyFloorPrintView: React.FC<{ stations: FloorStation[]; assemblies?: MachineAssembly[]; filterLabel?: string }> = ({
  stations,
  assemblies = [],
  filterLabel = 'Active Assembly Floor Stations'
}) => (
  <div>
    <GECPrintHeader docTitle="ASSEMBLY FLOOR & WORKSTATION TRACKING REPORT" />

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
  </div>
);

// 2. Sub-Assembly Units Floor Status Report
export const AssemblyListPrintView: React.FC<{ assemblies: any[]; filterLabel?: string }> = ({
  assemblies,
  filterLabel = 'Active Assembly Units'
}) => (
  <div>
    <GECPrintHeader docTitle="MACHINE SUB-ASSEMBLY STATIONS PROGRESS REPORT" />

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
      <div>Scope: <strong>{filterLabel}</strong> ({assemblies.length} sub-assemblies)</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>

    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: '30px' }}>#</th>
          <th>Assembly Code</th>
          <th>Work Order Ref</th>
          <th>Machine Model</th>
          <th>Sub-Assembly Station</th>
          <th style={{ width: '90px', textAlign: 'center' }}>Progress %</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {assemblies.map((a, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{a.assemblyCode}</td>
            <td style={{ fontWeight: 600 }}>{a.workOrderNo || '-'}</td>
            <td>{a.machineModel}</td>
            <td>{a.subAssemblyType}</td>
            <td style={{ textAlign: 'center', fontWeight: 800, color: a.progressPercentage === 100 ? '#16a34a' : '#2563eb' }}>
              {a.progressPercentage}%
            </td>
            <td>
              <span className={`badge ${a.progressPercentage === 100 ? 'badge-success' : 'badge-warning'}`}>
                {String(a.status || (a.progressPercentage === 100 ? 'TESTED_READY' : 'IN_PROGRESS')).replace(/_/g, ' ')}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <GECPrintSignatory preparedBy="Floor Lead" checkedBy="Plant Head" authorizedBy="Managing Director" />
  </div>
);

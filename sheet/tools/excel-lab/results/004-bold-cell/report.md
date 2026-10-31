# 004-bold-cell

Empty workbook → A1 = "Hello" and apply bold. Shows how formatting mutates xl/styles.xml (fonts/cellXfs) and the cell gets an s attribute (style index).

## Diffs

```diff
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\before/docProps/core.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\after/docProps/core.xml"
index 8790896..e018368 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\before/docProps/core.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\after/docProps/core.xml"
@@ -3,5 +3,5 @@
   <dc:creator>Eric Kono</dc:creator>
   <cp:lastModifiedBy>Eric Kono</cp:lastModifiedBy>
   <dcterms:created xsi:type="dcterms:W3CDTF">2026-06-17T19:23:07Z</dcterms:created>
-  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-06-17T19:23:07Z</dcterms:modified>
+  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-06-17T19:23:08Z</dcterms:modified>
 </cp:coreProperties>
\ No newline at end of file
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\before/xl/styles.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\after/xl/styles.xml"
index 9ad8d50..a64ce5a 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\before/xl/styles.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\after/xl/styles.xml"
@@ -1,6 +1,6 @@
 ´╗┐<?xml version="1.0" encoding="utf-8" standalone="yes"?>
 <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac x16r2 xr" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:x16r2="http://schemas.microsoft.com/office/spreadsheetml/2015/02/main" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision">
-  <fonts count="1" x14ac:knownFonts="1">
+  <fonts count="2" x14ac:knownFonts="1">
     <font>
       <sz val="11" />
       <color theme="1" />
@@ -8,6 +8,14 @@
       <family val="2" />
       <scheme val="minor" />
     </font>
+    <font>
+      <b />
+      <sz val="11" />
+      <color theme="1" />
+      <name val="Aptos Narrow" />
+      <family val="2" />
+      <scheme val="minor" />
+    </font>
   </fonts>
   <fills count="2">
     <fill>
@@ -29,8 +37,9 @@
   <cellStyleXfs count="1">
     <xf numFmtId="0" fontId="0" fillId="0" borderId="0" />
   </cellStyleXfs>
-  <cellXfs count="1">
+  <cellXfs count="2">
     <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" />
+    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" />
   </cellXfs>
   <cellStyles count="1">
     <cellStyle name="Normal" xfId="0" builtinId="0" />
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\before/xl/workbook.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\after/xl/workbook.xml"
index b7554cf..1578d77 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\before/xl/workbook.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\after/xl/workbook.xml"
@@ -7,7 +7,7 @@
       <x15ac:absPath url="D:\Projects\OfficeNext\SheetNext\tools\excel-lab\results\004-bold-cell\" xmlns:x15ac="http://schemas.microsoft.com/office/spreadsheetml/2010/11/ac" />
     </mc:Choice>
   </mc:AlternateContent>
-  <xr:revisionPtr revIDLastSave="0" documentId="8_{69F232EC-E686-4C1E-95BC-12964AC16DAB}" xr6:coauthVersionLast="47" xr6:coauthVersionMax="47" xr10:uidLastSave="{00000000-0000-0000-0000-000000000000}" />
+  <xr:revisionPtr revIDLastSave="0" documentId="8_{7D6690DF-8885-4B20-87BD-E8254620FC9C}" xr6:coauthVersionLast="47" xr6:coauthVersionMax="47" xr10:uidLastSave="{00000000-0000-0000-0000-000000000000}" />
   <bookViews>
     <workbookView xWindow="-120" yWindow="-120" windowWidth="38640" windowHeight="21120" xr2:uid="{7EF2EF09-5039-4CF6-B51A-5652EF21D8FE}" />
   </bookViews>
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\before/xl/worksheets/sheet1.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\after/xl/worksheets/sheet1.xml"
index 0007c85..cdc67a4 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\before/xl/worksheets/sheet1.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\004-bold-cell\\after/xl/worksheets/sheet1.xml"
@@ -7,7 +7,7 @@
   <sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25" />
   <sheetData>
     <row r="1" spans="1:1" x14ac:dyDescent="0.25">
-      <c r="A1" t="s">
+      <c r="A1" s="1" t="s">
         <v>0</v>
       </c>
     </row>

```

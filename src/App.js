import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Button,
  Grid,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Add,
  Image as ImageIcon,
  FileUpload,
  Download as DownloadIcon,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import _ from "lodash";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

// Separate ProductFields component
const ProductFields = React.memo(({ product, onFieldChange }) => {
  return (
    <>
      <Grid item xs={6} sm={4}>
        <TextField
          label="Brand"
          value={product.brand}
          fullWidth
          onChange={(e) => onFieldChange("brand", e.target.value)}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField
          label="Item #"
          value={product.itemNo}
          fullWidth
          onChange={(e) => onFieldChange("itemNo", e.target.value)}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField
          label="Action Item #"
          value={product.actionItemNo}
          fullWidth
          onChange={(e) => onFieldChange("actionItemNo", e.target.value)}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField
          label="Item Description"
          value={product.description}
          fullWidth
          onChange={(e) => onFieldChange("description", e.target.value)}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField
          label="FOB Price ($)"
          value={product.fobPrice}
          type="number"
          fullWidth
          onChange={(e) => onFieldChange("fobPrice", e.target.value)}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField
          label="Container Qty (40ftHQ)"
          value={product.containerQty40ftHQ}
          type="number"
          fullWidth
          onChange={(e) => onFieldChange("containerQty40ftHQ", e.target.value)}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField
          label="CBM"
          value={product.cbm}
          type="number"
          fullWidth
          onChange={(e) => onFieldChange("cbm", e.target.value)}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField
          label="Case Pack"
          value={product.casePack}
          type="number"
          fullWidth
          onChange={(e) => onFieldChange("casePack", e.target.value)}
        />
      </Grid>
      <Grid item xs={6} sm={4}>
        <TextField
          label="Customer SRP (€)"
          value={product.customerSrp}
          type="number"
          fullWidth
          onChange={(e) => onFieldChange("customerSrp", e.target.value)}
        />
      </Grid>
    </>
  );
});

// Settings Component
const Settings = React.memo(({ settings, onSettingsChange }) => {
  return (
    <div
      style={{
        padding: "20px",
        marginBottom: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Global Settings
      </Typography>
      <Grid container spacing={3}>
        {Object.entries(settings).map(([key, value]) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <TextField
              label={key.replace(/([A-Z])/g, " $1").toUpperCase()}
              value={value}
              type="number"
              fullWidth
              onChange={(e) => onSettingsChange(key, e.target.value)}
            />
          </Grid>
        ))}
      </Grid>
    </div>
  );
});

// Product Card Component
const ProductCard = React.memo(
  ({
    product,
    settings,
    onUpdate,
    onRemove,
    index,
    style, // Added for virtualization
  }) => {
    const calculateLandedPrice = useCallback(() => {
      const containerQty =
        product.containerQty40ftHQ ||
        Math.floor(67 / product.cbm) * product.casePack;
      const totalPurchaseCost = product.fobPrice * containerQty;
      const dutyCost = totalPurchaseCost * (settings.duty / 100);
      const totalCostUSD =
        totalPurchaseCost +
        dutyCost +
        settings.shippingCost +
        settings.localFreight;
      const totalCostEUR = totalCostUSD / settings.exchangeRate;
      return totalCostEUR / containerQty;
    }, [product, settings]);

    const calculateProfitPercentage = useCallback(
      (landedPrice) => {
        const vatRate = settings.vatRate / 100;
        const netSellingPrice = product.customerSrp / (1 + vatRate);
        const profit = netSellingPrice - landedPrice;
        const profitPercentage = (profit / product.customerSrp) * 100;
        return isNaN(profitPercentage) || !isFinite(profitPercentage)
          ? 0
          : profitPercentage.toFixed(2);
      },
      [product, settings.vatRate]
    );

    const landedPrice = useMemo(
      () => calculateLandedPrice(),
      [calculateLandedPrice]
    );
    const profitPercentage = useMemo(
      () => calculateProfitPercentage(landedPrice),
      [calculateProfitPercentage, landedPrice]
    );

    const handleFieldChange = useCallback(
      (field, value) => {
        onUpdate(index, {
          ...product,
          [field]:
            field.includes("Price") || field.includes("cbm")
              ? parseFloat(value) || 0
              : field.includes("casePack") || field.includes("containerQty")
              ? parseInt(value) || 0
              : value,
        });
      },
      [index, onUpdate, product]
    );

    return (
      <div
        style={{
          ...style,
          padding: "20px",
          marginBottom: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <div style={{ position: "relative" }}>
              <img
                src={product.image}
                alt={product.description || "Product image"}
                style={{ width: "100%", borderRadius: "8px" }}
              />
              <IconButton
                style={{ position: "absolute", bottom: "10px", right: "10px" }}
                onClick={() =>
                  document.getElementById(`image-upload-${index}`).click()
                }
              >
                <ImageIcon />
              </IconButton>
              <input
                type="file"
                id={`image-upload-${index}`}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      onUpdate(index, { ...product, image: e.target.result });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ display: "none" }}
                accept="image/*"
              />
            </div>
          </Grid>
          <Grid item xs={12} sm={9}>
            <Grid container spacing={1}>
              <ProductFields
                product={product}
                onFieldChange={handleFieldChange}
              />
              <Tooltip
                title={`FOB: $${product.fobPrice}, Duty: ${settings.duty}%, Shipping: $${settings.shippingCost}, Local Freight: $${settings.localFreight}`}
              >
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" style={{ color: "blue" }}>
                    Landed EU (€): €{landedPrice.toFixed(2)}
                  </Typography>
                </Grid>
              </Tooltip>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" style={{ color: "green" }}>
                  Profit for Retailer: {profitPercentage}%
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} style={{ textAlign: "right" }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => onRemove(index)}
            >
              Remove Product
            </Button>
          </Grid>
        </Grid>
      </div>
    );
  }
);

// Main Component
const ProductPresentation = () => {
  const fileInputRef = useRef(null);
  const dataFileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const [logo, setLogo] = useState("https://via.placeholder.com/200x80");
  const [settings, setSettings] = useState({
    exchangeRate: 1.1,
    shippingCost: 5000,
    localFreight: 1000,
    duty: 4.75,
    vatRate: 21,
    percentFee: 0,
  });

  const [products, setProducts] = useState(() => {
    const savedProducts = localStorage.getItem("products");
    return savedProducts
      ? JSON.parse(savedProducts)
      : [
          {
            itemNo: "77594",
            brand: "5 SURPRISE",
            description: "Monster Truck S3, Bulk (Phase Out AW25)",
            casePack: 24,
            fobPrice: 1.85,
            euRrp: 5.99,
            containerQty40ftHQ: 0,
            customerSrp: 10.0,
            cbm: 0.0148,
            image: "https://via.placeholder.com/200",
          },
          // ... other initial products
        ];
  });

  // Memoized handlers
  const handleProductUpdate = useCallback((index, updatedProduct) => {
    setProducts((prev) => {
      const newProducts = [...prev];
      newProducts[index] = updatedProduct;
      return newProducts;
    });
  }, []);

  const handleProductRemove = useCallback((index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const debouncedSettingsUpdate = useMemo(
    () =>
      _.debounce((newSettings) => {
        setSettings(newSettings);
      }, 300),
    []
  );

  const handleSettingsChange = useCallback(
    (key, value) => {
      const updatedSettings = { ...settings, [key]: parseFloat(value) };
      debouncedSettingsUpdate(updatedSettings);
    },
    [settings, debouncedSettingsUpdate]
  );

  // File handling functions
  const handleLogoUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogo(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDataImport = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.settings && data.products) {
            setSettings(data.settings);
            setProducts(
              data.products.map((product) => ({
                ...product,
                containerQty40ftHQ:
                  Math.floor(67 / product.cbm) * product.casePack,
              }))
            );
          }
        } catch (error) {
          alert("Error importing data. Please check the file format.");
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const handleExport = useCallback(() => {
    const data = {
      settings,
      products: products.map((p) => ({
        ...p,
        image: p.image.startsWith("data:")
          ? "https://via.placeholder.com/200"
          : p.image,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "action-presentation.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [settings, products]);

  // Excel handling
  const handleExcelImport = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const importedProducts = json.map((product) => ({
          itemNo: product["Item Number"] || "",
          brand: product["Brand"] || "",
          description: product["Description"] || "",
          casePack: product["Case Pack"] || 0,
          fobPrice: product["FOB Price ($)"] || 0,
          euRrp: product["EU RRP (€)"] || 0,
          containerQty40ftHQ:
            Math.floor(67 / (product["CBM"] || 0.0148)) *
            (product["Case Pack"] || 0),
          customerSrp: 0,
          cbm: product["CBM"] || 0.0148,
          image: "https://via.placeholder.com/200",
        }));
        setProducts(importedProducts);
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const handleExcelExport = useCallback(() => {
    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "products.xlsx");
  }, [products]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(products));
  }, [products]);

  // Virtualized Row renderer
  const Row = useCallback(
    ({ index, style }) => (
      <ProductCard
        product={products[index]}
        settings={settings}
        onUpdate={handleProductUpdate}
        onRemove={handleProductRemove}
        index={index}
        style={style}
      />
    ),
    [products, settings, handleProductUpdate, handleProductRemove]
  );

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "auto",
        padding: "20px",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      {/* Header with Logo */}
      <div
        style={{
          padding: "20px",
          marginBottom: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <Grid container alignItems="center" justifyContent="space-between">
          <div style={{ position: "relative", height: "80px", width: "200px" }}>
            <img
              src={logo}
              alt="Logo"
              style={{ height: "100%", objectFit: "contain" }}
            />
            <IconButton
              style={{ position: "absolute", bottom: "0", right: "0" }}
              onClick={() => logoInputRef.current?.click()}
            >
              <ImageIcon />
            </IconButton>
            <input
              type="file"
              ref={logoInputRef}
              onChange={handleLogoUpload}
              style={{ display: "none" }}
              accept="image/*"
            />
          </div>
          <div>
            <input
              type="file"
              ref={dataFileInputRef}
              onChange={handleDataImport}
              style={{ display: "none" }}
              accept=".json"
            />
            <Button
              variant="outlined"
              onClick={() => dataFileInputRef.current.click()}
              startIcon={<FileUpload />}
            >
              Import JSON
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleExport}
              startIcon={<DownloadIcon />}
              style={{ marginLeft: "10px" }}
            >
              Export JSON
            </Button>
            <input
              type="file"
              onChange={handleExcelImport}
              style={{ display: "none" }}
              ref={fileInputRef}
              accept=".xlsx, .xls"
            />
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current.click()}
              startIcon={<FileUpload />}
              style={{ marginLeft: "10px" }}
            >
              Import Excel
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleExcelExport}
              startIcon={<DownloadIcon />}
              style={{ marginLeft: "10px" }}
            >
              Export Excel
            </Button>
          </div>
        </Grid>
      </div>

      {/* Settings */}
      <Settings settings={settings} onSettingsChange={handleSettingsChange} />

      {/* Virtualized Products List */}
      <div style={{ height: "calc(100vh - 400px)", minHeight: "500px" }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={products.length}
              itemSize={350} // Adjust this value based on your card size
              overscanCount={2}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>

      {/* Add Product Button */}
      <Button
        variant="outlined"
        startIcon={<Add />}
        fullWidth
        onClick={() =>
          setProducts((prev) => [
            ...prev,
            {
              brand: "",
              itemNo: "",
              actionItemNo: "",
              description: "",
              casePack: 0,
              containerQty40ftHQ: 0,
              euRrp: 0,
              customerSrp: 0,
              fobPrice: 0,
              cbm: 0,
              image: "https://via.placeholder.com/200",
            },
          ])
        }
        style={{ marginTop: "20px", padding: "20px" }}
      >
        Add Product
      </Button>
    </div>
  );
};

export default ProductPresentation;
